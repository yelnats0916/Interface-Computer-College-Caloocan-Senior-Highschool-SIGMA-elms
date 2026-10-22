<?php
require_once __DIR__ . '/service_vault_auth.php';
require_once __DIR__ . '/application_auth.php';
require_once __DIR__ . '/data_provenance.php';

function sigmaRequireAiActor(array $roles = []): array {
    if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1','::1'], true) && !serviceRequestIsSecure()) { http_response_code(403); echo json_encode(['success'=>false,'error'=>'HTTPS is required for live AI access.']); exit; }
    return sigmaRequireApplicationActor(serviceSettingsPdo(), $roles);
}
