<?php
// Read-only dashboard endpoint. upload.php authenticates the administrator and
// returns aggregate usage without exposing service-account credentials.
if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET','OPTIONS'], true)) {
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['success'=>false,'error'=>'Storage usage is read-only.']);
    exit;
}
$_GET['action']='folder_usage';
require __DIR__.'/upload.php';
