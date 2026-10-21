<?php
// Read-only point-in-time checks. No synthetic uptime, cache or pool statistics.
$started = microtime(true);
ob_start();
ini_set('display_errors', '0');
try {
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../includes/service_vault_auth.php';
require_once __DIR__ . '/../includes/application_auth.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405); echo json_encode(['success'=>false,'error'=>'Use GET.']); exit;
}
require_once dirname(__DIR__, 2) . '/config/database.php';
sigmaRequireApplicationActor($pdo, ['admin', 'masteradmin', 'administrator']);
    $queryStarted = microtime(true);
    if ((int)$pdo->query('SELECT 1')->fetchColumn() !== 1) throw new RuntimeException('Database check failed.');
    $queryMs = round((microtime(true) - $queryStarted) * 1000, 2);
    $stmt = $pdo->query('SELECT COUNT(*) AS table_count, COALESCE(SUM(DATA_LENGTH + INDEX_LENGTH),0) AS storage_bytes FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
    $metadata = $stmt->fetch(PDO::FETCH_ASSOC);
    ob_clean();
    echo json_encode(['success'=>true, 'checkedAt'=>gmdate('c'),
        'application'=>['status'=>'responding','processingMs'=>round((microtime(true)-$started)*1000,2)],
        'database'=>['status'=>'connected','queryMs'=>$queryMs,'tables'=>(int)$metadata['table_count'],
            'allocatedBytes'=>(int)$metadata['storage_bytes']]]);
} catch (Throwable $error) {
    ob_clean();
    error_log('SIGMA metrics: '.$error->getMessage());
    http_response_code(503);
    echo json_encode(['success'=>false,'error'=>'The database measurement could not be completed.']);
}
