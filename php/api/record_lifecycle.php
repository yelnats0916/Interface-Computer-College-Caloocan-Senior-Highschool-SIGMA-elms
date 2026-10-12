<?php
header('Content-Type: application/json'); header('Cache-Control: no-store');
require_once __DIR__ . '/../includes/record_lifecycle.php';
restrictServiceOrigin();
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sigma-Actor');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
try {
    $actor = lifecycleActor(); lifecycleAuthorize($actor); $db = serviceSettingsPdo();
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
        if (($_GET['view'] ?? '') === 'events') {
            echo json_encode(['success' => true, 'events' => lifecycleEvents($db)]);
            exit;
        }
        $table = $_GET['table'] ?? '';
        echo json_encode(['success' => true, 'tables' => lifecycleTables($db), 'records' => $table ? lifecycleRemovedRecords($db, $table) : []]);
    } elseif (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
        $raw = file_get_contents('php://input', false, null, 0, 4097);
        if (strlen($raw) > 4096) throw new InvalidArgumentException('Request too large.');
        $input = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        lifecycleChange($db, $input['table'] ?? '', $input['id'] ?? '', $input['action'] ?? '', $actor, $input['confirmation'] ?? '');
        echo json_encode(['success' => true]);
    } else { http_response_code(405); echo json_encode(['success' => false]); }
} catch (Throwable $error) { http_response_code($error instanceof InvalidArgumentException ? 400 : 403); echo json_encode(['success' => false, 'error' => $error->getMessage()]); }
