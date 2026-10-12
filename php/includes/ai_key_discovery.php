<?php
require_once __DIR__ . '/service_key_validation.php';
function aiKeyProvider(string $key): string {
    if (preg_match('/^gsk_[A-Za-z0-9_-]+$/', $key)) return 'groq';
    if (preg_match('/^(AIza|AQ[._])[A-Za-z0-9_.-]+$/', $key)) return 'gemini';
    throw new InvalidArgumentException('Unrecognized Gemini or Groq key format.');
}

function verifyGroqModel(string $key, string $model, ?callable $request = null): void {
    $discovered = discoverAiKey($key, $request);
    if ($discovered['provider'] !== 'groq') throw new InvalidArgumentException('Select a Groq API key.');
    if (!in_array($model, array_column($discovered['models'], 'id'), true)) {
        throw new RuntimeException('The key is valid, but the selected model is unavailable. Edit the key and select an available model.');
    }
}

function discoverAiKey(string $key, ?callable $request = null): array {
    $key = validateOpaqueServiceKey($key);
    if (strlen($key) < 20 || strlen($key) > 2048) {
        throw new InvalidArgumentException('Paste a complete Gemini or Groq API key.');
    }
    $provider = aiKeyProvider($key);
    $request = $request ?? function (string $url, array $headers): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false
        ]);
        $raw = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false || $status < 200 || $status >= 300) {
            throw new RuntimeException($status === 401 || $status === 403 || $status === 400
                ? 'The provider rejected this key. Check the key and its permissions.'
                : 'Unable to load models from the provider. Try again.');
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) throw new RuntimeException('Invalid model response from the provider.');
        return $data;
    };
    $models = [];
    $token = '';
    for ($page = 0; $page < 10; $page++) {
        $url = $provider === 'gemini'
            ? 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000' . ($token ? '&pageToken=' . rawurlencode($token) : '')
            : 'https://api.groq.com/openai/v1/models';
        $headers = $provider === 'gemini' ? ['x-goog-api-key: ' . $key] : ['Authorization: Bearer ' . $key];
        $data = $request($url, $headers);
        foreach (($provider === 'gemini' ? ($data['models'] ?? []) : ($data['data'] ?? [])) as $model) {
            if ($provider === 'gemini') {
                if (!in_array('generateContent', $model['supportedGenerationMethods'] ?? [], true)) continue;
                $id = preg_replace('/^models\//', '', $model['name'] ?? '');
            } else {
                $id = $model['id'] ?? '';
                if (($model['active'] ?? true) === false || preg_match('/whisper|tts|speech|orpheus|embedding/i', $id)) continue;
            }
            if ($id !== '') $models[$id] = ['id' => $id, 'label' => $model['displayName'] ?? $id];
        }
        $token = $provider === 'gemini' ? ($data['nextPageToken'] ?? '') : '';
        if (!$token) break;
        if ($page === 9) throw new RuntimeException('Model list is incomplete. Try again.');
    }
    if (!$models) throw new RuntimeException('No text-generation models are available for this key.');
    return ['provider' => $provider, 'models' => array_values($models)];
}
