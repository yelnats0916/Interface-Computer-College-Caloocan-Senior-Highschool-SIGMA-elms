<?php
/**
 * SIGMA ELMS — Google reCAPTCHA Verification Service
 * Interface Computer College Caloocan SHS
 */

require_once __DIR__ . '/recaptcha_config.php';

class RecaptchaService {
    /**
     * Verifies a Google reCAPTCHA response token
     */
    public static function verify(string $token, ?string $remoteIp = null): array {
        $token = trim($token);
        if (empty($token)) {
            return ['success' => false, 'error' => 'reCAPTCHA token is missing'];
        }

        $rootDir = dirname(__DIR__, 2);
        $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
        $config = normalizeRecaptchaConfig($services['recaptcha'] ?? []);
        $secretKey = $config['secret_key'];
        if (!empty($secretKey) && $secretKey === $config['site_key']) {
            return ['success' => false, 'error' => 'Site Key and Secret Key are identical. Replace the saved secret key.'];
        }

        if (empty($secretKey)) {
            return ['success' => false, 'error' => 'reCAPTCHA secret key is not configured'];
        }

        if (strpos($token, 'SIGMA_TEST_RECAPTCHA_TOKEN_') === 0) {
            return ['success' => false, 'error' => 'Simulated tokens are not accepted'];
        }

        $postData = [
            'secret'   => $secretKey,
            'response' => $token,
        ];
        if (!empty($remoteIp)) {
            $postData['remoteip'] = $remoteIp;
        }

        if (!function_exists('curl_init')) return ['success' => false, 'error' => 'Server verification is unavailable'];
        $ch = curl_init('https://www.google.com/recaptcha/api/siteverify');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        $res = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($res ?: '', true);
        return self::validateResponse($data ?: [], $config, strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]));
    }

    public static function validateResponse(array $data, array $config, string $expectedHost): array {
        $details = [
            'score' => isset($data['score']) ? (float) $data['score'] : null,
            'action' => $data['action'] ?? null,
            'hostname' => $data['hostname'] ?? null
        ];
        if (!$data || empty($data['success'])) {
            return array_merge($details, [
                'success' => false,
                'error'   => $data['error-codes'][0] ?? 'reCAPTCHA verification failed'
            ]);
        }

        if (($config['version'] ?? 'v2') === 'v3' && (($data['action'] ?? '') !== 'login' || (float) ($data['score'] ?? 0) < 0.5)) {
            return array_merge($details, ['success' => false, 'error' => 'reCAPTCHA risk assessment did not pass']);
        }
        $verifiedHost = strtolower($data['hostname'] ?? '');
        $localHosts = ['localhost', '127.0.0.1'];
        if ($expectedHost !== '' && $verifiedHost !== $expectedHost && !(in_array($expectedHost, $localHosts, true) && in_array($verifiedHost, $localHosts, true))) {
            return array_merge($details, ['success' => false, 'error' => 'reCAPTCHA hostname does not match this website']);
        }
        return array_merge($details, ['success' => true]);
    }
}
