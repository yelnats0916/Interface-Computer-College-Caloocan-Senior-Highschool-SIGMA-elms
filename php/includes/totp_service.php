<?php
/**
 * SIGMA ELMS — Google Authenticator (TOTP RFC 6238) Service
 * Interface Computer College Caloocan SHS
 * 
 * Generates secrets, validates 6-digit rolling codes, and formats QR codes for User IDs or generated emails.
 */

class TotpService {
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generates a secure random 16-character Base32 Secret Key
     */
    public static function generateSecret(int $length = 16): string {
        $secret = '';
        $max = strlen(self::BASE32_CHARS) - 1;
        for ($i = 0; $i < $length; $i++) {
            $secret .= self::BASE32_CHARS[random_int(0, $max)];
        }
        return $secret;
    }

    /**
     * Calculates the current 6-digit TOTP code for a secret at a given time
     */
    public static function getCode(string $secret, ?int $timeSlice = null): string {
        if ($timeSlice === null) {
            $timeSlice = (int) floor(time() / 30);
        }

        $secretKey = self::base32Decode($secret);
        if ($secretKey === false) return '';

        // Pack time slice into 8-byte big-endian binary string
        $time = pack('N*', 0) . pack('N*', $timeSlice);

        // HMAC-SHA1
        $hash = hash_hmac('sha1', $time, $secretKey, true);

        // Dynamic truncation
        $offset = ord(substr($hash, -1)) & 0x0F;
        $hashPart = substr($hash, $offset, 4);
        $value = unpack('N', $hashPart)[1] & 0x7FFFFFFF;

        $modulo = pow(10, 6);
        return str_pad((string)($value % $modulo), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Verifies a 6-digit code against the secret (with clock-drift tolerance of ±1 step = ±30s)
     */
    public static function verifyCode(string $secret, string $code, int $discrepancy = 1): bool {
        $code = trim(preg_replace('/\s+/', '', $code));
        if (strlen($code) !== 6 || !ctype_digit($code)) {
            return false;
        }

        $currentTimeSlice = (int) floor(time() / 30);

        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $calculatedCode = self::getCode($secret, $currentTimeSlice + $i);
            if (hash_equals($calculatedCode, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generates the otpauth:// URI and QR code image URL
     */
    public static function getQrCodeData(string $secret, string $accountLabel, string $issuer = 'SIGMA'): array {
        $label = rawurlencode($issuer . ':' . $accountLabel);
        $issuerEncoded = rawurlencode($issuer);
        $otpauthUrl = "otpauth://totp/{$label}?secret={$secret}&issuer={$issuerEncoded}&algorithm=SHA1&digits=6&period=30";
        
        $qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=" . urlencode($otpauthUrl);

        return [
            'secret'       => $secret,
            'otpauth_url'  => $otpauthUrl,
            'qr_image_url' => $qrImageUrl,
            'label'        => $accountLabel,
            'issuer'       => $issuer
        ];
    }

    /**
     * Decodes a Base32 string to binary
     */
    private static function base32Decode(string $b32): string|false {
        $b32 = strtoupper(trim($b32));
        if ($b32 === '') return '';

        $chars = self::BASE32_CHARS;
        $binary = '';
        $len = strlen($b32);

        for ($i = 0; $i < $len; $i++) {
            $pos = strpos($chars, $b32[$i]);
            if ($pos === false) return false;
            $binary .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }

        $octets = str_split($binary, 8);
        $result = '';
        foreach ($octets as $octet) {
            if (strlen($octet) === 8) {
                $result .= chr(bindec($octet));
            }
        }

        return $result;
    }
}
