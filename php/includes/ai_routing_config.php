<?php

function aiRoutingFeatures(): array {
    return ['sigmabot', 'analytics', 'quiz', 'submission_evaluation', 'submission_feedback', 'grade_insights'];
}

function aiRoutingDefaultProvider(string $feature): string {
    return in_array($feature, ['sigmabot', 'quiz'], true) ? 'groq' : 'gemini';
}

function aiRoutingVault(array $services): array {
    $vault = array_values(array_filter($services['ai_vault'] ?? [], fn($key) => in_array($key['provider'] ?? '', ['gemini', 'groq'], true)));
    if (!$vault) {
        foreach (['gemini', 'groq'] as $provider) {
            if (!empty($services[$provider]['api_key'])) {
                $vault[] = ['id' => 'key_' . $provider . '_init', 'provider' => $provider];
            }
        }
    }
    return $vault;
}

function aiRoutingConfig(array $services, ?array $vault = null): array {
    $vault = $vault ?? aiRoutingVault($services);
    $saved = $services['ai_routing'] ?? [];
    $defaults = [];
    foreach (['gemini', 'groq'] as $provider) {
        $pool = array_values(array_filter($vault, fn($key) => ($key['provider'] ?? '') === $provider));
        $ids = array_column($pool, 'id');
        $preferred = $saved['defaults'][$provider] ?? '';
        $legacy = $services['active_ai_key_id'] ?? '';
        $defaults[$provider] = in_array($preferred, $ids, true) ? $preferred
            : (in_array($legacy, $ids, true) ? $legacy : ($ids[0] ?? ''));
    }
    $features = [];
    foreach (aiRoutingFeatures() as $feature) {
        $value = $saved['features'][$feature] ?? $services['ai_designations'][$feature] ?? aiRoutingDefaultProvider($feature);
        if (!in_array($value, ['gemini', 'groq'], true)) {
            $key = array_values(array_filter($vault, fn($key) => ($key['id'] ?? '') === $value));
            $value = $key[0]['provider'] ?? 'gemini';
            if (!in_array($value, ['gemini', 'groq'], true)) $value = 'gemini';
        }
        $features[$feature] = $value;
    }
    return ['features' => $features, 'defaults' => $defaults, 'allow_fallback' => (bool) ($saved['allow_fallback'] ?? true)];
}

function updateAiRoutingConfig(array $services, array $payload): array {
    $routing = aiRoutingConfig($services);
    $vault = aiRoutingVault($services);
    foreach (aiRoutingFeatures() as $feature) {
        $provider = $payload['features'][$feature] ?? null;
        if (!in_array($provider, ['gemini', 'groq'], true)) {
            throw new InvalidArgumentException('Choose Gemini or Groq for every AI feature.');
        }
        $routing['features'][$feature] = $provider;
    }
    foreach (['gemini', 'groq'] as $provider) {
        $id = $payload['defaults'][$provider] ?? null;
        $ids = array_column(array_filter($vault, fn($key) => ($key['provider'] ?? '') === $provider), 'id');
        if (!is_string($id) || ($ids ? !in_array($id, $ids, true) : $id !== '')) {
            throw new InvalidArgumentException('Choose a stored key belonging to the selected provider.');
        }
        $routing['defaults'][$provider] = $id;
    }
    if (!isset($payload['allow_fallback']) || !is_bool($payload['allow_fallback'])) {
        throw new InvalidArgumentException('Temporary fallback must be on or off.');
    }
    $routing['allow_fallback'] = $payload['allow_fallback'];
    return $routing;
}

function aiFeatureRequestKeys(array $services, string $feature): array {
    if (!in_array($feature, aiRoutingFeatures(), true)) throw new InvalidArgumentException('Unsupported AI feature.');
    $routing = aiRoutingConfig($services);
    $provider = $routing['features'][$feature];
    $find = function ($provider) use ($services, $routing) {
        foreach ($services['ai_vault'] ?? [] as $key) {
            if (($key['id'] ?? '') === $routing['defaults'][$provider] && ($key['provider'] ?? '') === $provider && !empty($key['api_key'])) return $key;
        }
        return null;
    };
    $key = $find($provider);
    if (!$key) throw new RuntimeException('Configure a default API key for this AI feature first.');
    return ['primary' => $key, 'fallback' => $routing['allow_fallback'] ? $find($provider === 'gemini' ? 'groq' : 'gemini') : null];
}
