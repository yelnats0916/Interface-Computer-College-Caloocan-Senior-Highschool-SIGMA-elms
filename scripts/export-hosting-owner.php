<?php
// Explicit server-operator transfer of the owner's existing master account and service settings.
// Output is private, must remain outside the repository, and is never part of a release archive.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$args = getopt('', ['id:', 'output:']);
$id = (string)($args['id'] ?? '');
$output = (string)($args['output'] ?? '');
$parent = realpath(dirname($output));
$root = realpath(dirname(__DIR__));
if (!$id || !$parent || str_starts_with(strtolower(str_replace('\\', '/', $parent)) . '/', strtolower(str_replace('\\', '/', $root)) . '/')) {
    throw new RuntimeException('Supply --id and --output outside the repository.');
}
require $root . '/config/database.php';
require_once $root . '/php/includes/service_secrets.php';
require_once $root . '/php/includes/data_provenance.php';
if (!$pdo) throw new RuntimeException('Database unavailable.');
$stmt = $pdo->prepare('SELECT * FROM users WHERE id=? AND is_deleted=0 LIMIT 1');
$stmt->execute([$id]);
$user = $stmt->fetch();
if (!$user || strtolower($user['status']) !== 'active'
    || preg_replace('/[\s_-]+/', '', strtolower($user['role'])) !== 'masteradmin'
    || password_get_info($user['password'])['algo'] === null
    || sigmaSyntheticRecordPath($user) !== null) throw new RuntimeException('A verified existing master admin with a hashed password is required.');
$bundle = ['version'=>1, 'owner'=>$user, 'services'=>loadServiceSettings()];
$json = json_encode($bundle, JSON_THROW_ON_ERROR);
if (file_put_contents($output, $json, LOCK_EX) !== strlen($json)) throw new RuntimeException('Private export failed.');
@chmod($output, 0600);
echo "Private owner transfer prepared: one existing master admin and service configuration. No other users or academic records exported.\n";
