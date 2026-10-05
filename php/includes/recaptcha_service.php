<?php
/**
 * SIGMA ELMS — Google reCAPTCHA Verification Service
 * Interface Computer College Caloocan SHS
 */

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
        $secretKey = $services['recaptcha']['secret_key'] ?? '';

        // If secret key is not configured, allow bypass or return demo success
        if (empty($secretKey)) {
            return [
                'success' => true,
                'score'   => 1.0,
                'mode'    => 'simulated_success (no secret key configured)'
            ];
        }

        $postData = [
            'secret'   => $secretKey,
            'response' => $token,
        ];
        if (!empty($remoteIp)) {
            $postData['remoteip'] = $remoteIp;
        }

        $ch = curl_init('https://www.google.com/recaptcha/api/siteverify');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        $res = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($res, true);
        if (!$data || empty($data['success'])) {
            return [
                'success' => false,
                'error'   => $data['error-codes'][0] ?? 'reCAPTCHA verification failed'
            ];
        }

        return [
            'success'  => true,
            'score'    => $data['score'] ?? 1.0,
            'hostname' => $data['hostname'] ?? ''
        ];
    }
}
