<?php
// CLI only. Source bundle is transferred over SSH into a directory outside the web root.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$args = getopt('', ['release:', 'bundle:']);
$release = realpath((string)($args['release'] ?? ''));
$bundleFile = realpath((string)($args['bundle'] ?? ''));
if (!$release || !$bundleFile || str_starts_with($bundleFile, $release . '/public/')) throw new RuntimeException('Private release and transfer paths are required.');
require $release . '/public/config/database.php';
require_once $release . '/public/php/includes/service_secrets.php';
require_once $release . '/public/php/includes/data_provenance.php';
if (!$pdo || $pdo->query('SELECT DATABASE()')->fetchColumn() !== 'sigma-elms_db') throw new RuntimeException('Wrong hosting database.');
$bundle = json_decode(file_get_contents($bundleFile), true, 64, JSON_THROW_ON_ERROR);
$user = $bundle['owner'] ?? [];
if (($bundle['version'] ?? null) !== 1 || !is_array($bundle['services'] ?? null)
    || !is_array($user) || empty($user['id']) || !empty($user['is_deleted'])
    || preg_replace('/[\s_-]+/', '', strtolower($user['role'] ?? '')) !== 'masteradmin'
    || strtolower($user['status'] ?? '') !== 'active'
    || password_get_info($user['password'] ?? '')['algo'] === null
    || sigmaSyntheticRecordPath($user) !== null) throw new RuntimeException('Transfer identity verification failed.');
try {
    $pdo->beginTransaction();
    if ($pdo->query('SELECT COUNT(*) FROM users')->fetchColumn()
        || $pdo->query('SELECT COUNT(*) FROM system_service_settings')->fetchColumn()) {
        throw new RuntimeException('Initial owner transfer requires empty account and service tables.');
    }
    $fields = array_column($pdo->query('SHOW COLUMNS FROM users')->fetchAll(), 'Field');
    $user = array_intersect_key($user, array_flip($fields));
    $columns = implode(',', array_map(fn($name) => '`' . $name . '`', array_keys($user)));
    $marks = implode(',', array_fill(0, count($user), '?'));
    $pdo->prepare("INSERT INTO users ($columns) VALUES ($marks)")->execute(array_values($user));
    saveServiceSettings($bundle['services']);
    if (loadServiceSettings() !== $bundle['services']) throw new RuntimeException('Service configuration verification failed.');
    $pdo->prepare('INSERT INTO audit_logs(user_id,action) VALUES(?,?)')->execute([$user['id'], 'Existing master admin and encrypted service settings transferred by server operator for initial hosted deployment.']);
    $pdo->commit();
    echo "One existing master admin transferred with original password hash and authenticator enrollment. Service settings re-encrypted using the hosting key. No sample data or other accounts imported.\n";
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $error;
}
