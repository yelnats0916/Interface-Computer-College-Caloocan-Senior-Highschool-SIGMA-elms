<?php
/**
 * SIGMA ELMS - API Credentials & Services Configuration
 * Centralizes keys for Gemini AI, Pusher, Google Drive, and Google reCAPTCHA.
 */

return [
    // 1. Google Gemini API (Sigma Bot AI Assistant)
    'gemini' => [
        'api_key' => getenv('GEMINI_API_KEY') ?: '',
        'model'   => 'gemini-1.5-flash',
    ],

    // 2. Pusher (Real-Time Push Notifications)
    'pusher' => [
        'app_id'  => getenv('PUSHER_APP_ID')  ?: '',
        'key'     => getenv('PUSHER_KEY')     ?: '',
        'secret'  => getenv('PUSHER_SECRET')  ?: '',
        'cluster' => getenv('PUSHER_CLUSTER') ?: 'ap1',
    ],

    // 3. Google reCAPTCHA v2 / v3 (Login Security)
    'recaptcha' => [
        'site_key'   => getenv('RECAPTCHA_SITE_KEY')   ?: '',
        'secret_key' => getenv('RECAPTCHA_SECRET_KEY') ?: '',
    ],

    // 4. Google Drive API (Learning Materials Storage)
    'google_drive' => [
        'client_id'     => getenv('GOOGLE_DRIVE_CLIENT_ID')     ?: '',
        'client_secret' => getenv('GOOGLE_DRIVE_CLIENT_SECRET') ?: '',
        'folder_id'     => getenv('GOOGLE_DRIVE_FOLDER_ID')     ?: '',
    ],
];
