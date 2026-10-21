<?php
require_once __DIR__ . '/service_vault_auth.php';
require_once __DIR__ . '/application_auth.php';
require_once __DIR__ . '/data_provenance.php';

function sigmaRequireAiActor(array $roles = []): array {
    return sigmaRequireApplicationActor(serviceSettingsPdo(), $roles);
}
