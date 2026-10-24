<?php
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
require_once __DIR__.'/../includes/gdrive_oauth.php';
require_once __DIR__.'/../includes/service_vault_auth.php';
require_once __DIR__.'/../includes/application_auth.php';
require_once __DIR__.'/../includes/activity_audit.php';
$db=serviceSettingsPdo();
$action=(string)($_GET['action']??'status');
function driveOAuthOut(array $data,int $status=200): void { http_response_code($status);header('Content-Type: application/json');echo json_encode($data);exit; }
try {
    if ($action==='callback') {
        $state=(string)($_GET['state']??'');
        if (!preg_match('/^[a-f0-9]{64}$/D',$state) || !hash_equals((string)($_COOKIE['sigma_drive_oauth']??''),$state)) throw new RuntimeException('The Google connection request expired or could not be verified. Start again from Drive settings.');
        $db->beginTransaction();
        $q=$db->prepare('SELECT * FROM gdrive_oauth_states WHERE state_hash=? AND expires_at>UTC_TIMESTAMP() FOR UPDATE');
        $q->execute([hash('sha256',$state)]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new RuntimeException('The Google connection request has expired.');
        $db->prepare('DELETE FROM gdrive_oauth_states WHERE state_hash=?')->execute([hash('sha256',$state)]);$db->commit();
        setcookie('sigma_drive_oauth','',['expires'=>time()-3600,'path'=>'/php/api/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
        if (!empty($_GET['error'])) throw new RuntimeException('Google account connection was canceled.');
        $actorQuery=$db->prepare('SELECT * FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)=\'active\'');$actorQuery->execute([$row['actor_id']]);
        $actor=$actorQuery->fetch(PDO::FETCH_ASSOC);
        if (!$actor || !serviceVaultAdmin($actor)) throw new RuntimeException('Administrator access is no longer available.');
        $settings=loadServiceSettings();$oauth=$settings['google_drive']['oauth']??[];
        $pending=decryptServiceSettings($row['encrypted_request'],serviceMasterKey());
        if (!hash_equals((string)($oauth['client_id']??''),(string)$pending['client_id'])) throw new RuntimeException('OAuth credentials changed. Start the connection again.');
        $tokens=sigmaDriveOAuthRequest(['code'=>(string)($_GET['code']??''),'client_id'=>$oauth['client_id'],'client_secret'=>$oauth['client_secret'],
            'redirect_uri'=>sigmaDriveOAuthRedirect(),'code_verifier'=>$pending['verifier'],'grant_type'=>'authorization_code']);
        if (empty($tokens['refresh_token'])) throw new RuntimeException('Google did not grant offline access. Reconnect and allow the requested Drive access.');
        if (!in_array('https://www.googleapis.com/auth/drive',explode(' ',(string)($tokens['scope']??'')),true)) throw new RuntimeException('Drive access was not granted. Reconnect and allow Drive access.');
        $settings['google_drive']['oauth']=array_merge($oauth,['refresh_token'=>$tokens['refresh_token'],'access_token'=>$tokens['access_token'],
            'expires_at'=>time()+(int)($tokens['expires_in']??3600),'connected_by'=>(string)$row['actor_id'],'connected_at'=>gmdate('c')]);
        saveServiceSettings($settings);
        sigmaRecordActivity($db,(string)$row['actor_id'],'Connected Google Drive Account','System','Google account authorization connected for Drive storage.');
        header('Location: /admin.html#settings-gdrive-view',true,303);exit;
    }
    restrictServiceOrigin();
    $actor=sigmaRequireApplicationActor($db,['admin','masteradmin','administrator']);
    requireServiceVaultAccess();
    $settings=loadServiceSettings();$oauth=$settings['google_drive']['oauth']??[];
    if ($action==='status' && ($_SERVER['REQUEST_METHOD']??'GET')==='GET') {
        require_once __DIR__.'/../includes/material_storage.php';sigmaEnsureMaterialUploads($db);
        $pending=(int)$db->query('SELECT COUNT(*) FROM material_uploads WHERE synced_at IS NULL AND is_superseded=0')->fetchColumn();
        driveOAuthOut(['success'=>true,'configured'=>!empty($oauth['client_id']),'connected'=>!empty($oauth['refresh_token']),
            'redirect_uri'=>sigmaDriveOAuthRedirect(),'pending_files'=>$pending]);
    }
    if (($_SERVER['REQUEST_METHOD']??'GET')!=='POST') driveOAuthOut(['success'=>false,'error'=>'Method not allowed.'],405);
    if ($action==='sync_pending') {
        require_once __DIR__.'/../includes/material_storage.php';
        driveOAuthOut(['success'=>true]+sigmaSyncPendingMaterialUploads($db));
    }
    if ($action==='configure') {
        $file=$_FILES['credentials']??null;
        if (!$file || $file['error']!==UPLOAD_ERR_OK || $file['size']>32768 || !is_uploaded_file($file['tmp_name'])) throw new InvalidArgumentException('Choose an OAuth client JSON file smaller than 32 KB.');
        $client=sigmaDriveOAuthClient(json_decode(file_get_contents($file['tmp_name']),true)?:[]);
        // New credentials invalidate the previous account connection.
        $settings['google_drive']['oauth']=$client;saveServiceSettings($settings);
        sigmaRecordActivity($db,(string)$actor['id'],'Updated Google Drive OAuth Client','System','Google OAuth Web application credentials were stored securely.');
        driveOAuthOut(['success'=>true]);
    }
    if ($action==='begin') {
        if (empty($oauth['client_id']) || empty($oauth['client_secret'])) throw new InvalidArgumentException('Upload the OAuth Web application JSON first.');
        $db->exec('CREATE TABLE IF NOT EXISTS gdrive_oauth_states (state_hash CHAR(64) PRIMARY KEY, actor_id VARCHAR(64) NOT NULL, encrypted_request LONGTEXT NOT NULL, expires_at DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        $state=bin2hex(random_bytes(32));$verifier=rtrim(strtr(base64_encode(random_bytes(48)),'+/','-_'),'=');
        $db->prepare('DELETE FROM gdrive_oauth_states WHERE expires_at<UTC_TIMESTAMP()')->execute();
        $db->prepare('INSERT INTO gdrive_oauth_states VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))')->execute([
            hash('sha256',$state),(string)$actor['id'],encryptServiceSettings(['client_id'=>$oauth['client_id'],'verifier'=>$verifier],serviceMasterKey())]);
        setcookie('sigma_drive_oauth',$state,['expires'=>time()+600,'path'=>'/php/api/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
        $params=['client_id'=>$oauth['client_id'],'redirect_uri'=>sigmaDriveOAuthRedirect(),'response_type'=>'code','scope'=>'https://www.googleapis.com/auth/drive',
            'access_type'=>'offline','prompt'=>'consent','state'=>$state,'code_challenge'=>rtrim(strtr(base64_encode(hash('sha256',$verifier,true)),'+/','-_'),'='),'code_challenge_method'=>'S256'];
        driveOAuthOut(['success'=>true,'url'=>'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query($params)]);
    }
    driveOAuthOut(['success'=>false,'error'=>'Unknown action.'],400);
} catch(Throwable $error) {
    if($db->inTransaction())$db->rollBack();
    $message=$error instanceof InvalidArgumentException || get_class($error) === RuntimeException::class ? $error->getMessage() : 'Unable to connect Google Drive. Try again from Drive settings.';
    if($action==='callback') {
        http_response_code(400);header('Content-Type: text/html; charset=utf-8');header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
        echo '<!doctype html><html lang="en"><meta charset="utf-8"><title>Google Drive Connection</title><body style="font-family:Arial;padding:40px;max-width:700px"><h1>Google Drive Connection</h1><p>'.htmlspecialchars($message,ENT_QUOTES,'UTF-8').'</p><a href="/admin.html#settings-gdrive-view">Return to Drive settings</a></body></html>';exit;
    }
    driveOAuthOut(['success'=>false,'error'=>$message],400);
}
