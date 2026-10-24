<?php
require_once __DIR__.'/service_secrets.php';

function sigmaDriveOAuthRedirect(): string {
    return 'https://sigma-elms.alwaysdata.net/php/api/gdrive_oauth.php?action=callback';
}

function sigmaDriveOAuthRequest(array $fields): array {
    $ch=curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>http_build_query($fields),
        CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>25]);
    $raw=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    $data=json_decode($raw ?: '',true);
    if ($status < 200 || $status >= 300 || empty($data['access_token'])) throw new RuntimeException('Google authorization failed. Reconnect the Google account and check the OAuth client configuration.');
    return $data;
}

function sigmaDriveOAuthAccessToken(array $config): ?string {
    $oauth=$config['oauth']??[];
    if (empty($oauth['refresh_token'])) return null;
    if (!empty($oauth['access_token']) && (int)($oauth['expires_at']??0)>time()+60) return $oauth['access_token'];
    try {
        $tokens=sigmaDriveOAuthRequest(['client_id'=>$oauth['client_id'],'client_secret'=>$oauth['client_secret'],
            'refresh_token'=>$oauth['refresh_token'],'grant_type'=>'refresh_token']);
        $settings=loadServiceSettings();
        $settings['google_drive']['oauth']['access_token']=$tokens['access_token'];
        $settings['google_drive']['oauth']['expires_at']=time()+(int)($tokens['expires_in']??3600);
        saveServiceSettings($settings);
        return $tokens['access_token'];
    } catch (Throwable $error) { return null; }
}

function sigmaDriveOAuthClient(array $payload): array {
    $client=$payload['web']??null;
    if (!is_array($client) || !preg_match('/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/D',(string)($client['client_id']??'')) || strlen($client['client_secret']??'')<10)
        throw new InvalidArgumentException('Upload the JSON credentials for a Google OAuth Web application. A service account key cannot be used here.');
    if (!in_array(sigmaDriveOAuthRedirect(),$client['redirect_uris']??[],true)) throw new InvalidArgumentException('Add the displayed callback URL to the OAuth client’s authorized redirect URIs, then download its JSON again.');
    return ['client_id'=>$client['client_id'],'client_secret'=>$client['client_secret']];
}
