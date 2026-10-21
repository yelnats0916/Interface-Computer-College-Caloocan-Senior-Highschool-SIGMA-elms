<?php
/**
 * SIGMA ELMS — Authentication & Security REST API (2FA / Google Authenticator & reCAPTCHA)
 * Interface Computer College Caloocan SHS
 * 
 * Endpoint: /php/api/auth.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$rootDir = dirname(__DIR__, 2);
require_once $rootDir . '/php/includes/service_vault_auth.php';
require_once $rootDir . '/php/includes/service_key_validation.php';
restrictServiceOrigin();
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Network metadata comes from the connection, never a client-supplied IP or
// an untrusted forwarded header. This endpoint does not require a database.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'client_network') {
    $address = $_SERVER['REMOTE_ADDR'] ?? '';
    echo json_encode(['success' => true, 'ip' => filter_var($address, FILTER_VALIDATE_IP) ? $address : null]);
    exit;
}

$rootDir = dirname(__DIR__, 2);
require_once $rootDir . '/config/database.php';
require_once $rootDir . '/php/includes/totp_service.php';
require_once $rootDir . '/php/includes/application_auth.php';
require_once $rootDir . '/php/includes/recaptcha_service.php';
require_once $rootDir . '/php/includes/recaptcha_config.php';
require_once $rootDir . '/php/includes/ai_routing_config.php';
require_once $rootDir . '/php/includes/ai_key_discovery.php';
require_once $rootDir . '/php/includes/ai_test_status.php';

function jsonOut(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!$pdo) {
    jsonOut(['success' => false, 'error' => 'Database connection unavailable'], 503);
}

$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input', false, null, 0, 65537);
if (strlen($rawInput) > 65536) jsonOut(['success' => false, 'error' => 'Credential request exceeds the supported size.'], 413);
$payload = json_decode($rawInput, true) ?: $_POST;

try {
    // ── GET: Check 2FA status or reCAPTCHA config ────────────────────────────
    if ($method === 'GET') {
        $action = trim($_GET['action'] ?? '');
        if ($action === 'recaptcha_config' || isset($_GET['recaptcha'])) {
            $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
            jsonOut(publicRecaptchaConfig($services['recaptcha'] ?? []));
        }

        if ($action === 'ai_vault' || $action === 'ai_config') {
            requireServiceVaultAccess();
            $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
            $vault = array_values(array_filter($services['ai_vault'] ?? [], fn($key) => in_array($key['provider'] ?? '', ['gemini', 'groq'], true)));
            $activeId = $services['active_ai_key_id'] ?? '';

            // Auto-migrate legacy standalone keys if vault is empty
            if (empty($vault)) {
                $geminiKey = trim($services['gemini']['api_key'] ?? '');
                $groqKey = trim($services['groq']['api_key'] ?? '');
                if (!empty($geminiKey)) {
                    $vault[] = [
                        'id' => 'key_gemini_init',
                        'label' => 'Primary Google Gemini Key',
                        'provider' => 'gemini',
                        'model' => $services['gemini']['model'] ?? 'gemini-1.5-flash',
                        'api_key' => $geminiKey,
                        'is_active' => true,
                        'created_at' => date('M j, Y, g:i A'),
                        'last_tested' => null,
                        'last_status' => 'ready'
                    ];
                    $activeId = 'key_gemini_init';
                }
                if (!empty($groqKey)) {
                    $vault[] = [
                        'id' => 'key_groq_init',
                        'label' => 'Primary Groq Key',
                        'provider' => 'groq',
                        'model' => $services['groq']['model'] ?? 'llama-3.3-70b-versatile',
                        'api_key' => $groqKey,
                        'is_active' => empty($activeId),
                        'created_at' => date('M j, Y, g:i A'),
                        'last_tested' => null,
                        'last_status' => 'ready'
                    ];
                    if (empty($activeId)) $activeId = 'key_groq_init';
                }
            }

            // Determine active key
            $activeKey = null;
            foreach ($vault as $k) {
                if ($k['id'] === $activeId || (!empty($k['is_active']) && empty($activeKey))) {
                    $activeKey = $k;
                    break;
                }
            }

            $publicKeys = array_map(function($k) use ($rootDir) {
                $k = array_merge($k, readAiTestStatus($rootDir, $k));
                $raw = trim($k['api_key'] ?? '');
                $masked = !empty($raw) ? substr($raw, 0, 4) . '••••••••' . substr($raw, -4) : 'Not configured';
                return [
                    'id' => $k['id'],
                    'label' => $k['label'] ?? 'API Key',
                    'provider' => $k['provider'] ?? 'gemini',
                    'model' => $k['model'] ?? 'gemini-1.5-flash',
                    'masked_key' => $masked,
                    'is_active' => !empty($k['is_active']),
                    'created_at' => $k['created_at'] ?? 'Recently',
                    'last_tested' => $k['last_tested'] ?? null,
                    'last_status' => $k['last_status'] ?? 'untested'
                ];
            }, $vault);

            $geminiKey = trim($services['gemini']['api_key'] ?? '');
            $groqKey = trim($services['groq']['api_key'] ?? '');

            jsonOut([
                'success' => true,
                'active_id' => $activeKey ? $activeKey['id'] : '',
                'active_key' => $activeKey ? [
                    'id' => $activeKey['id'],
                    'label' => $activeKey['label'],
                    'provider' => $activeKey['provider'],
                    'model' => $activeKey['model'],
                    'masked_key' => substr($activeKey['api_key'], 0, 4) . '••••••••' . substr($activeKey['api_key'], -4)
                ] : null,
                'keys' => $publicKeys,
                'routing' => aiRoutingConfig($services, $vault),
                'designations' => $services['ai_designations'] ?? [
                    'sigmabot' => 'auto',
                    'analytics' => 'auto',
                    'quiz' => 'auto'
                ],
                'gemini' => [
                    'configured' => !empty($geminiKey),
                    'model' => $services['gemini']['model'] ?? 'gemini-1.5-flash',
                    'masked_key' => !empty($geminiKey) ? substr($geminiKey, 0, 4) . '••••••••' . substr($geminiKey, -4) : 'Not configured'
                ],
                'groq' => [
                    'configured' => !empty($groqKey),
                    'model' => $services['groq']['model'] ?? 'llama-3.3-70b-versatile',
                    'masked_key' => !empty($groqKey) ? substr($groqKey, 0, 4) . '••••••••' . substr($groqKey, -4) : 'Not configured'
                ]
            ]);
        }

        $userId = trim($_GET['id'] ?? $_GET['uid'] ?? '');
        if (empty($userId)) {
            jsonOut(['success' => false, 'error' => 'User ID is required'], 400);
        }

        sigmaRequireOwnIdentity($pdo, $userId, true);
        $stmt = $pdo->prepare("SELECT id, full_name, email, role, totp_enabled, terms_accepted, terms_accepted_at FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            jsonOut(['success' => false, 'error' => 'User not found'], 404);
        }

        jsonOut([
            'success'         => true,
            'id'              => $user['id'],
            'fullName'        => $user['full_name'],
            'role'            => $user['role'],
            'totpEnabled'     => (bool) $user['totp_enabled'],
            'termsAccepted'   => (bool) ($user['terms_accepted'] ?? 0),
            'termsAcceptedAt' => $user['terms_accepted_at'] ?? null
        ]);
    }

    if ($method !== 'POST') {
        jsonOut(['success' => false, 'error' => 'Method not allowed'], 405);
    }

    $action = trim($payload['action'] ?? '');
    if ($action === 'authorize_service_vault') {
        try { jsonOut(['success' => true, 'token' => authorizeServiceVault($payload), 'expires_in' => 900]); }
        catch (InvalidArgumentException | RuntimeException $error) { jsonOut(['success' => false, 'error' => $error->getMessage()], 403); }
    }
    if (in_array($action, ['save_ai_routing', 'save_recaptcha_config', 'discover_ai_key', 'save_ai_vault_key', 'save_ai_config', 'save_ai_designations', 'set_active_ai_key', 'delete_ai_key', 'test_ai_vault_key', 'test_ai_connection'], true)) requireServiceVaultAccess();

    if ($action === 'save_ai_routing') {
        $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
        try {
            $services['ai_routing'] = updateAiRoutingConfig($services, $payload);
        } catch (InvalidArgumentException $error) {
            jsonOut(['success' => false, 'error' => $error->getMessage()], 400);
        }
        if (saveServiceSettings($services) === false) {
            jsonOut(['success' => false, 'error' => 'Unable to save AI routing settings.'], 500);
        }
        jsonOut(['success' => true, 'routing' => $services['ai_routing']]);
    }

    // ── POST: SAVE RECAPTCHA CONFIG ──────────────────────────────────────────
    if ($action === 'save_recaptcha_config') {
        $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
        try {
            $services['recaptcha'] = updateRecaptchaConfig($services['recaptcha'] ?? [], $payload);
        } catch (InvalidArgumentException $error) {
            jsonOut(['success' => false, 'error' => $error->getMessage()], 400);
        }
        if (saveServiceSettings($services) === false) {
            jsonOut(['success' => false, 'error' => 'Unable to save reCAPTCHA configuration on the server'], 500);
        }

        jsonOut(publicRecaptchaConfig($services['recaptcha']));
    }

    if ($action === 'discover_ai_key') {
        header('Cache-Control: no-store');
        try {
            $discoveryKey = trim($payload['api_key'] ?? '');
            $storedKeyId = trim($payload['id'] ?? '');
            if ($storedKeyId !== '') {
                $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
                $storedKey = null;
                foreach ($services['ai_vault'] ?? [] as $entry) {
                    if (($entry['id'] ?? '') === $storedKeyId) { $storedKey = $entry; break; }
                }
                if (!$storedKey) jsonOut(['success' => false, 'error' => 'Stored API key not found.'], 404);
                $discoveryKey = $storedKey['api_key'] ?? '';
            }
            jsonOut(['success' => true] + discoverAiKey($discoveryKey));
        } catch (InvalidArgumentException $error) {
            jsonOut(['success' => false, 'error' => $error->getMessage()], 400);
        } catch (RuntimeException $error) {
            jsonOut(['success' => false, 'error' => $error->getMessage()], 502);
        }
    }

    // ── POST: SAVE AI VAULT KEY ──────────────────────────────────────────────
    if ($action === 'save_ai_vault_key' || $action === 'save_ai_config') {
        $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
        if (!isset($services['ai_vault'])) $services['ai_vault'] = [];

        $keyId = trim($payload['id'] ?? '');
        $provider = trim($payload['provider'] ?? $payload['engine'] ?? 'gemini');
        $label = trim($payload['label'] ?? '');
        $model = trim($payload['model'] ?? '');
        $apiKey = trim($payload['api_key'] ?? '');
        if ($apiKey !== '' && $apiKey !== '__PRESERVE__') {
            try {
                validateOpaqueServiceKey($apiKey);
                if (aiKeyProvider($apiKey) !== $provider) throw new InvalidArgumentException('The API key does not match the selected provider.');
            } catch (InvalidArgumentException $error) { jsonOut(['success' => false, 'error' => $error->getMessage()], 400); }
        }
        if ($model !== '' && !preg_match('/^[A-Za-z0-9][A-Za-z0-9._\/-]{0,199}$/', $model)) jsonOut(['success' => false, 'error' => 'Invalid model identifier.'], 400);
        if (strlen($label) > 80 || preg_match('/[\x00-\x1f\x7f]/', $label)) jsonOut(['success' => false, 'error' => 'API key labels must be at most 80 characters without control characters.'], 400);
        $setActive = isset($payload['set_active']) ? !empty($payload['set_active']) : true;

        if (!empty($payload['auto_detect']) && $apiKey !== '__PRESERVE__') {
            try {
                $discovered = discoverAiKey($apiKey);
                $provider = $discovered['provider'];
                if (!in_array($model, array_column($discovered['models'], 'id'), true)) {
                    jsonOut(['success' => false, 'error' => 'Select an available model for this key.'], 400);
                }
            } catch (InvalidArgumentException $error) {
                jsonOut(['success' => false, 'error' => $error->getMessage()], 400);
            } catch (RuntimeException $error) {
                jsonOut(['success' => false, 'error' => $error->getMessage()], 502);
            }
        }

        if ($provider !== 'gemini' && $provider !== 'groq') {
            jsonOut(['success' => false, 'error' => 'Invalid AI provider'], 400);
        }
        if (empty($label)) {
            $label = ($provider === 'gemini' ? 'Google Gemini' : 'Groq') . ' Key';
        }
        if (empty($model)) {
            $model = $provider === 'gemini' ? 'gemini-1.5-flash' : 'llama-3.3-70b-versatile';
        }

        $existingIdx = -1;
        if (!empty($keyId)) {
            foreach ($services['ai_vault'] as $idx => $k) {
                if ($k['id'] === $keyId) {
                    $existingIdx = $idx;
                    break;
                }
            }
        }

        if ($existingIdx < 0 && $apiKey === '__PRESERVE__') jsonOut(['success' => false, 'error' => 'A new configuration requires an actual API key.'], 400);
        $effectiveApiKey = $apiKey;
        if ($existingIdx >= 0 && ($apiKey === '' || $apiKey === '__PRESERVE__')) {
            $effectiveApiKey = $services['ai_vault'][$existingIdx]['api_key'] ?? '';
        }
        if ($effectiveApiKey !== '') {
            foreach ($services['ai_vault'] as $idx => $entry) {
                if ($idx === $existingIdx) continue;
                if (trim($entry['api_key'] ?? '') === $effectiveApiKey && trim($entry['model'] ?? '') === $model) {
                    jsonOut(['success' => false, 'error' => 'This API key and model combination is already configured. Choose a different model or API key.'], 409);
                }
            }
        }

        if ($existingIdx >= 0) {
            if (empty($payload['label'])) $label = $services['ai_vault'][$existingIdx]['label'];
            $services['ai_vault'][$existingIdx]['label'] = $label;
            $services['ai_vault'][$existingIdx]['provider'] = $provider;
            $services['ai_vault'][$existingIdx]['model'] = $model;
            if (!empty($apiKey) && $apiKey !== '__PRESERVE__') {
                $services['ai_vault'][$existingIdx]['api_key'] = $apiKey;
            }
            if ($setActive) {
                foreach ($services['ai_vault'] as &$k) { $k['is_active'] = false; }
                unset($k);
                $services['ai_vault'][$existingIdx]['is_active'] = true;
                $services['active_ai_key_id'] = $keyId;
            }
        } else {
            if (empty($apiKey)) {
                jsonOut(['success' => false, 'error' => 'API Key cannot be empty'], 400);
            }
            $newId = 'key_' . substr(md5(uniqid(mt_rand(), true)), 0, 10);
            if (empty($payload['label'])) {
                $number = 1;
                $names = array_column($services['ai_vault'], 'label');
                $base = ($provider === 'gemini' ? 'Gemini' : 'Groq') . ' Key ';
                while (in_array($base . $number, $names, true)) $number++;
                $label = $base . $number;
            }
            $isFirst = empty($services['ai_vault']);
            if ($setActive || $isFirst) {
                foreach ($services['ai_vault'] as &$k) { $k['is_active'] = false; }
                unset($k);
                $services['active_ai_key_id'] = $newId;
            }

            $services['ai_vault'][] = [
                'id' => $newId,
                'label' => $label,
                'provider' => $provider,
                'model' => $model,
                'api_key' => $apiKey,
                'is_active' => $setActive || $isFirst,
                'created_at' => date('M j, Y, g:i A'),
                'last_tested' => null,
                'last_status' => 'untested'
            ];
        }

        $services['ai_routing'] = aiRoutingConfig($services);
        if (!empty($payload['set_provider_default'])) {
            $services['ai_routing']['defaults'][$provider] = $existingIdx >= 0 ? $keyId : $newId;
        }

        // Sync active key to legacy entries for existing integrations
        $activeKey = null;
        $activeId = $services['active_ai_key_id'] ?? '';
        foreach ($services['ai_vault'] as $k) {
            if ($k['id'] === $activeId || (!empty($k['is_active']) && empty($activeKey))) {
                $activeKey = $k;
                break;
            }
        }
        if ($activeKey) {
            $prov = $activeKey['provider'];
            if (!isset($services[$prov])) $services[$prov] = [];
            $services[$prov]['api_key'] = $activeKey['api_key'];
            $services[$prov]['model'] = $activeKey['model'];
        }
        saveServiceSettings($services);

        jsonOut(['success' => true, 'message' => 'API key saved to vault successfully']);
    }

    // ── POST: SAVE AI FEATURE DESIGNATIONS ───────────────────────────────────
    if ($action === 'save_ai_designations') {
        $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
        $sigmabot = trim($payload['sigmabot'] ?? 'auto');
        $analytics = trim($payload['analytics'] ?? 'auto');
        $quiz = trim($payload['quiz'] ?? 'auto');

        $services['ai_designations'] = [
            'sigmabot' => $sigmabot,
            'analytics' => $analytics,
            'quiz' => $quiz
        ];
        saveServiceSettings($services);

        jsonOut(['success' => true, 'message' => 'AI subsystem routing designations saved successfully', 'designations' => $services['ai_designations']]);
    }

    // ── POST: SET ACTIVE AI KEY ──────────────────────────────────────────────
    if ($action === 'set_active_ai_key') {
        $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
        $keyId = trim($payload['id'] ?? '');
        if (empty($keyId)) {
            jsonOut(['success' => false, 'error' => 'Key ID required'], 400);
        }

        $found = false;
        $activeKey = null;
        if (isset($services['ai_vault'])) {
            foreach ($services['ai_vault'] as &$k) {
                if ($k['id'] === $keyId) {
                    $k['is_active'] = true;
                    $found = true;
                    $activeKey = $k;
                } else {
                    $k['is_active'] = false;
                }
            }
        }

        if (!$found) {
            jsonOut(['success' => false, 'error' => 'Key not found in vault'], 404);
        }

        $services['active_ai_key_id'] = $keyId;
        if ($activeKey) {
            $prov = $activeKey['provider'];
            if (!isset($services[$prov])) $services[$prov] = [];
            $services[$prov]['api_key'] = $activeKey['api_key'];
            $services[$prov]['model'] = $activeKey['model'];
        }
        saveServiceSettings($services);

        jsonOut(['success' => true, 'message' => 'Active AI engine updated', 'active_id' => $keyId]);
    }

    // ── POST: DELETE AI KEY ──────────────────────────────────────────────────
    if ($action === 'delete_ai_key') {
        $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
        $keyId = trim($payload['id'] ?? '');
        if (empty($keyId)) {
            jsonOut(['success' => false, 'error' => 'Key ID required'], 400);
        }

        $filtered = [];
        $wasActive = false;
        if (isset($services['ai_vault'])) {
            foreach ($services['ai_vault'] as $k) {
                if ($k['id'] === $keyId) {
                    if (!empty($k['is_active'])) $wasActive = true;
                } else {
                    $filtered[] = $k;
                }
            }
        }

        if ($wasActive && !empty($filtered)) {
            $filtered[0]['is_active'] = true;
            $services['active_ai_key_id'] = $filtered[0]['id'];
            $prov = $filtered[0]['provider'];
            $services[$prov]['api_key'] = $filtered[0]['api_key'];
            $services[$prov]['model'] = $filtered[0]['model'];
        } elseif (empty($filtered)) {
            $services['active_ai_key_id'] = '';
            if (isset($services['gemini'])) $services['gemini']['api_key'] = '';
            if (isset($services['groq'])) $services['groq']['api_key'] = '';
        }

        $services['ai_vault'] = $filtered;
        saveServiceSettings($services);

        jsonOut(['success' => true, 'message' => 'API key removed from vault']);
    }

    // ── POST: TEST AI KEY HANDSHAKE ──────────────────────────────────────────
    if ($action === 'test_ai_vault_key' || $action === 'test_ai_connection') {
        $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
        $keyId = trim($payload['id'] ?? '');
        $engine = trim($payload['engine'] ?? $payload['provider'] ?? '');
        $apiKey = trim($payload['api_key'] ?? '');
        $model = trim($payload['model'] ?? '');

        if (!empty($keyId) && isset($services['ai_vault'])) {
            foreach ($services['ai_vault'] as $k) {
                if ($k['id'] === $keyId) {
                    $engine = $k['provider'];
                    $apiKey = $k['api_key'];
                    $model = $k['model'];
                    break;
                }
            }
        }

        if (empty($apiKey)) {
            $apiKey = $services[$engine]['api_key'] ?? '';
        }
        if (empty($model)) {
            $model = $services[$engine]['model'] ?? ($engine === 'gemini' ? 'gemini-1.5-flash' : 'llama-3.3-70b-versatile');
        }

        if (empty($apiKey)) {
            jsonOut(['success' => false, 'error' => 'No API key provided to test'], 400);
        }

        $testPassed = false;
        $message = '';
        $errorMsg = '';

        if ($engine === 'gemini') {
            $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model);
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['x-goog-api-key: ' . $apiKey]);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $testPassed = true;
                $message = "Handshake successful with Google Gemini ({$model}).";
            } else {
                $errorMsg = "Gemini API rejected request (HTTP {$httpCode}). Verify your API key.";
            }
        } elseif ($engine === 'groq') {
            try {
                verifyGroqModel($apiKey, $model);
                $testPassed = true;
                $message = "Handshake successful with Groq ({$model}).";
            } catch (InvalidArgumentException | RuntimeException $error) {
                $errorMsg = $error->getMessage();
            }
        }

        if (!empty($keyId) && isset($services['ai_vault'])) {
            foreach ($services['ai_vault'] as $k) {
                if ($k['id'] === $keyId) {
                    saveAiTestStatus($rootDir, $k, $testPassed);
                    break;
                }
            }
        }

        if ($testPassed) {
            jsonOut(['success' => true, 'message' => $message]);
        } else {
            jsonOut(['success' => false, 'error' => $errorMsg]);
        }
    }

    // ── POST: VERIFY RECAPTCHA ───────────────────────────────────────────────
    if ($action === 'verify_recaptcha') {
        $token = trim($payload['token'] ?? '');
        $remoteIp = $_SERVER['REMOTE_ADDR'] ?? null;
        $result = RecaptchaService::verify($token, $remoteIp);
        jsonOut($result);
    }

    // ── POST: SETUP 2FA (Generate Secret + QR Code) ──────────────────────────
    if (in_array($action, ['setup_2fa', 'verify_and_enable_2fa', 'verify_login_2fa', 'accept_terms'], true)) {
        sigmaRequireOwnIdentity($pdo, trim((string)($payload['id'] ?? $payload['uid'] ?? '')), true);
    }

    if ($action === 'setup_2fa') {
        $userId = trim($payload['id'] ?? $payload['uid'] ?? '');
        if (empty($userId)) {
            jsonOut(['success' => false, 'error' => 'User ID is required'], 400);
        }

        $stmt = $pdo->prepare("SELECT id, full_name, email, role, totp_secret, totp_enabled FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            jsonOut(['success' => false, 'error' => 'User not found in system'], 404);
        }

        if (!empty($user['totp_enabled'])) jsonOut(['success' => false, 'error' => 'Authenticator is already enabled. Verify its existing code.'], 409);

        // Generate or reuse pending secret
        $secret = TotpService::generateSecret(16);
        $accountLabel = trim((string)($user['id'] ?? $userId));

        // Save secret tentatively in database
        $upd = $pdo->prepare("UPDATE users SET totp_secret = ? WHERE id = ?");
        $upd->execute([$secret, $userId]);

        $qrData = TotpService::getQrCodeData($secret, $accountLabel, 'SIGMA');

        jsonOut([
            'success'       => true,
            'message'       => 'Google Authenticator setup initiated',
            'userId'        => $user['id'],
            'secret'        => $secret,
            'otpauth_url'   => $qrData['otpauth_url'],
            'qr_image_url'  => $qrData['qr_image_url'],
            'label'         => $accountLabel
        ]);
    }

    // ── POST: VERIFY & ENABLE 2FA ────────────────────────────────────────────
    if ($action === 'verify_and_enable_2fa') {
        $userId = trim($payload['id'] ?? $payload['uid'] ?? '');
        $code = trim($payload['code'] ?? '');

        if (empty($userId) || empty($code)) {
            jsonOut(['success' => false, 'error' => 'User ID and 6-digit code are required'], 400);
        }

        $stmt = $pdo->prepare("SELECT id, totp_secret FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || empty($user['totp_secret'])) {
            jsonOut(['success' => false, 'error' => 'No 2FA setup found. Please scan the QR code first.'], 400);
        }

        sigmaTwoFactorRateLimit($pdo, $userId);
        $isValid = TotpService::verifyCode($user['totp_secret'], $code);
        sigmaTwoFactorRateLimit($pdo, $userId, $isValid);
        if (!$isValid) {
            jsonOut(['success' => false, 'error' => 'Invalid or expired 6-digit authenticator code. Check your device time.'], 401);
        }

        // Enable 2FA
        $upd = $pdo->prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?");
        $upd->execute([$userId]);
        $pdo->prepare('DELETE FROM grade_sync_tokens WHERE user_id=?')->execute([$userId]);

        jsonOut([
            'success' => true,
            'message' => 'Google Authenticator 2FA activated successfully!'
        ]);
    }

    // ── POST: VERIFY 2FA CODE ON LOGIN ───────────────────────────────────────
    if ($action === 'verify_login_2fa') {
        $userId = trim($payload['id'] ?? $payload['uid'] ?? '');
        $code = trim($payload['code'] ?? '');

        if (empty($userId) || empty($code)) {
            jsonOut(['success' => false, 'error' => 'User ID and 6-digit code are required'], 400);
        }

        $stmt = $pdo->prepare("SELECT id, full_name, email, role, totp_secret, totp_enabled FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || empty($user['totp_secret']) || empty($user['totp_enabled'])) {
            jsonOut(['success' => false, 'error' => '2FA is not enabled for this user account.'], 400);
        }

        sigmaTwoFactorRateLimit($pdo, $userId);
        $isValid = TotpService::verifyCode($user['totp_secret'], $code);
        sigmaTwoFactorRateLimit($pdo, $userId, $isValid);
        if (!$isValid) {
            jsonOut(['success' => false, 'error' => 'Invalid 6-digit code. Please check Google Authenticator on your phone.'], 401);
        }

        jsonOut([
            'success' => true,
            'message' => 'Two-factor authentication verified successfully',
            'user'    => [
                'id'       => $user['id'],
                'fullName' => $user['full_name'],
                'email'    => $user['email'],
                'role'     => $user['role']
            ]
        ]);
    }

    // ── POST: ACCEPT TERMS OF USE & PRIVACY AGREEMENT ───────────────────────
    if ($action === 'accept_terms') {
        $userId = trim($payload['id'] ?? $payload['uid'] ?? '');
        if (empty($userId)) {
            jsonOut(['success' => false, 'error' => 'User ID is required'], 400);
        }

        $now = gmdate('Y-m-d H:i:s');
        $upd = $pdo->prepare("UPDATE users SET terms_accepted = 1, terms_accepted_at = ? WHERE id = ?");
        $upd->execute([$now, $userId]);

        jsonOut([
            'success'         => true,
            'message'         => 'Terms of Use & Privacy Agreement accepted successfully.',
            'termsAccepted'   => true,
            'termsAcceptedAt' => $now
        ]);
    }

    // ── POST: DISABLE 2FA ────────────────────────────────────────────────────
    if ($action === 'disable_2fa') {
        $userId = trim($payload['id'] ?? $payload['uid'] ?? '');
        if (empty($userId)) {
            jsonOut(['success' => false, 'error' => 'User ID is required'], 400);
        }

        $actor = sigmaApplicationUser($pdo);
        if (!$actor) {
            // A password challenge cannot replace a lost second factor.
            sigmaRequireOwnIdentity($pdo, $userId, true);
            jsonOut(['success' => false, 'code' => 'recovery_required', 'error' => 'Your authenticator has not been reset. Ask a signed-in school administrator to verify your identity and reset 2FA in User Management. For a master admin account, ask another signed-in master admin or the server administrator. Then return to Login to set up a new authenticator.'], 403);
        }
        $stmt = $pdo->prepare('SELECT id, role FROM users WHERE id=? AND is_deleted=0 LIMIT 1');
        $stmt->execute([$userId]);
        $target = $stmt->fetch();
        if (!$target) jsonOut(['success' => false, 'error' => 'Account not found.'], 404);
        if (!sigmaCanResetAuthenticator($actor, $target)) {
            jsonOut(['success' => false, 'error' => 'A verified administrator with authority over this account must reset its authenticator.'], 403);
        }
        $pdo->beginTransaction();
        $upd = $pdo->prepare("UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?");
        $upd->execute([$userId]);
        sigmaRevokeAccountSessions($pdo, $userId);
        try {
            $pdo->prepare('DELETE FROM service_vault_sessions WHERE user_id=?')->execute([$userId]);
        } catch (PDOException $error) {
            if ($error->getCode() !== '42S02') throw $error;
        }
        $pdo->commit();

        jsonOut([
            'success' => true,
            'message' => 'Google Authenticator 2FA has been disabled.'
        ]);
    }

    jsonOut(['success' => false, 'error' => 'Invalid action specified'], 400);

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    jsonOut(['success' => false, 'error' => $e->getMessage()], 500);
}
