const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const authPhpPath = path.join(root, 'php/api/auth.php');
let authPhp = fs.readFileSync(authPhpPath, 'utf8');

// Replace GET action === 'ai_config' block
const getOldBlock = `        if ($action === 'ai_config') {
            $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
            $geminiKey = trim($services['gemini']['api_key'] ?? '');
            $grokKey = trim($services['grok']['api_key'] ?? '');
            jsonOut([
                'success' => true,
                'gemini' => [
                    'configured' => !empty($geminiKey),
                    'model' => $services['gemini']['model'] ?? 'gemini-1.5-flash',
                    'masked_key' => !empty($geminiKey) ? substr($geminiKey, 0, 4) . '••••••••' . substr($geminiKey, -4) : 'Not configured'
                ],
                'grok' => [
                    'configured' => !empty($grokKey),
                    'model' => $services['grok']['model'] ?? 'grok-2',
                    'masked_key' => !empty($grokKey) ? substr($grokKey, 0, 4) . '••••••••' . substr($grokKey, -4) : 'Not configured'
                ]
            ]);
        }`;

const getNewBlock = `        if ($action === 'ai_vault' || $action === 'ai_config') {
            $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
            $vault = $services['ai_vault'] ?? [];
            $activeId = $services['active_ai_key_id'] ?? '';

            // Auto-migrate legacy standalone keys if vault is empty
            if (empty($vault)) {
                $geminiKey = trim($services['gemini']['api_key'] ?? '');
                $grokKey = trim($services['grok']['api_key'] ?? '');
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
                if (!empty($grokKey)) {
                    $vault[] = [
                        'id' => 'key_grok_init',
                        'label' => 'Primary xAI Grok Key',
                        'provider' => 'grok',
                        'model' => $services['grok']['model'] ?? 'grok-2',
                        'api_key' => $grokKey,
                        'is_active' => empty($activeId),
                        'created_at' => date('M j, Y, g:i A'),
                        'last_tested' => null,
                        'last_status' => 'ready'
                    ];
                    if (empty($activeId)) $activeId = 'key_grok_init';
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

            $publicKeys = array_map(function($k) {
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
            $grokKey = trim($services['grok']['api_key'] ?? '');

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
                'gemini' => [
                    'configured' => !empty($geminiKey),
                    'model' => $services['gemini']['model'] ?? 'gemini-1.5-flash',
                    'masked_key' => !empty($geminiKey) ? substr($geminiKey, 0, 4) . '••••••••' . substr($geminiKey, -4) : 'Not configured'
                ],
                'grok' => [
                    'configured' => !empty($grokKey),
                    'model' => $services['grok']['model'] ?? 'grok-2',
                    'masked_key' => !empty($grokKey) ? substr($grokKey, 0, 4) . '••••••••' . substr($grokKey, -4) : 'Not configured'
                ]
            ]);
        }`;

authPhp = authPhp.replace(getOldBlock, getNewBlock);

// Replace POST actions for save_ai_config and test_ai_connection with the full vault endpoints
const postOldBlockRegex = /    \/\/ ── POST: SAVE AI CONFIG ─────────────────────────────────────────────────[\s\S]*?    \/\/ ── POST: VERIFY RECAPTCHA ───────────────────────────────────────────────/;

const postNewBlock = `    // ── POST: SAVE AI VAULT KEY ──────────────────────────────────────────────
    if ($action === 'save_ai_vault_key' || $action === 'save_ai_config') {
        $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
        if (!isset($services['ai_vault'])) $services['ai_vault'] = [];

        $keyId = trim($payload['id'] ?? '');
        $provider = trim($payload['provider'] ?? $payload['engine'] ?? 'gemini');
        $label = trim($payload['label'] ?? '');
        $model = trim($payload['model'] ?? '');
        $apiKey = trim($payload['api_key'] ?? '');
        $setActive = isset($payload['set_active']) ? !empty($payload['set_active']) : true;

        if ($provider !== 'gemini' && $provider !== 'grok') {
            jsonOut(['success' => false, 'error' => 'Invalid AI provider'], 400);
        }
        if (empty($label)) {
            $label = ($provider === 'gemini' ? 'Google Gemini' : 'xAI Grok') . ' Key';
        }
        if (empty($model)) {
            $model = $provider === 'gemini' ? 'gemini-1.5-flash' : 'grok-2';
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

        if ($existingIdx >= 0) {
            $services['ai_vault'][$existingIdx]['label'] = $label;
            $services['ai_vault'][$existingIdx]['provider'] = $provider;
            $services['ai_vault'][$existingIdx]['model'] = $model;
            if (!empty($apiKey) && $apiKey !== '__PRESERVE__') {
                $services['ai_vault'][$existingIdx]['api_key'] = $apiKey;
            }
            if ($setActive) {
                foreach ($services['ai_vault'] as &$k) { $k['is_active'] = false; }
                $services['ai_vault'][$existingIdx]['is_active'] = true;
                $services['active_ai_key_id'] = $keyId;
            }
        } else {
            if (empty($apiKey)) {
                jsonOut(['success' => false, 'error' => 'API Key cannot be empty'], 400);
            }
            $newId = 'key_' . substr(md5(uniqid(mt_rand(), true)), 0, 10);
            $isFirst = empty($services['ai_vault']);
            if ($setActive || $isFirst) {
                foreach ($services['ai_vault'] as &$k) { $k['is_active'] = false; }
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

        $configExport = "<?php\\n/**\\n * SIGMA ELMS - API Credentials & Services Configuration\\n */\\n\\nreturn " . var_export($services, true) . ";\\n";
        file_put_contents($rootDir . '/config/services.php', $configExport, LOCK_EX);

        jsonOut(['success' => true, 'message' => 'API key saved to vault successfully']);
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

        $configExport = "<?php\\n/**\\n * SIGMA ELMS - API Credentials & Services Configuration\\n */\\n\\nreturn " . var_export($services, true) . ";\\n";
        file_put_contents($rootDir . '/config/services.php', $configExport, LOCK_EX);

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
            if (isset($services['grok'])) $services['grok']['api_key'] = '';
        }

        $services['ai_vault'] = $filtered;
        $configExport = "<?php\\n/**\\n * SIGMA ELMS - API Credentials & Services Configuration\\n */\\n\\nreturn " . var_export($services, true) . ";\\n";
        file_put_contents($rootDir . '/config/services.php', $configExport, LOCK_EX);

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
            $model = $services[$engine]['model'] ?? ($engine === 'gemini' ? 'gemini-1.5-flash' : 'grok-2');
        }

        if (empty($apiKey)) {
            jsonOut(['success' => false, 'error' => 'No API key provided to test'], 400);
        }

        $testPassed = false;
        $message = '';
        $errorMsg = '';

        if ($engine === 'gemini') {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}?key={$apiKey}";
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $testPassed = true;
                $message = "Handshake successful with Google Gemini ({$model}).";
            } else {
                $errorMsg = "Gemini API rejected request (HTTP {$httpCode}). Verify your API key.";
            }
        } elseif ($engine === 'grok') {
            $url = "https://api.x.ai/v1/models";
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer {$apiKey}"]);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $testPassed = true;
                $message = "Handshake successful with xAI Grok ({$model}).";
            } else {
                $errorMsg = "xAI API rejected request (HTTP {$httpCode}). Verify your xAI key.";
            }
        }

        if (!empty($keyId) && isset($services['ai_vault'])) {
            foreach ($services['ai_vault'] as &$k) {
                if ($k['id'] === $keyId) {
                    $k['last_tested'] = date('M j, Y, g:i A');
                    $k['last_status'] = $testPassed ? 'connected' : 'failed';
                    break;
                }
            }
            $configExport = "<?php\\n/**\\n * SIGMA ELMS - API Credentials & Services Configuration\\n */\\n\\nreturn " . var_export($services, true) . ";\\n";
            file_put_contents($rootDir . '/config/services.php', $configExport, LOCK_EX);
        }

        if ($testPassed) {
            jsonOut(['success' => true, 'message' => $message]);
        } else {
            jsonOut(['success' => false, 'error' => $errorMsg]);
        }
    }

    // ── POST: VERIFY RECAPTCHA ───────────────────────────────────────────────`;

authPhp = authPhp.replace(postOldBlockRegex, postNewBlock);

fs.writeFileSync(authPhpPath, authPhp, 'utf8');
console.log('php/api/auth.php updated with AI Vault handlers.');
