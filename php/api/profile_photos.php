<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__) . '/includes/application_auth.php';
require_once dirname(__DIR__) . '/includes/service_vault_auth.php';
restrictServiceOrigin();
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
$actor = sigmaRequireApplicationActor($pdo);
function photoReply(array $body, int $code = 200): void { http_response_code($code); echo json_encode($body); exit; }
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = $method === 'POST' ? json_decode(file_get_contents('php://input', false, null, 0, 100001), true) : $_GET;
    if (!is_array($input)) photoReply(['success'=>false,'error'=>'Invalid photo request.'],400);
    $id = (string)($input['userId'] ?? $actor['id']);
    $lookup=$pdo->prepare('SELECT role, avatar FROM users WHERE id=? AND is_deleted=0'); $lookup->execute([$id]); $target=$lookup->fetch(PDO::FETCH_ASSOC);
    if (!$target) photoReply(['success'=>false,'error'=>'Account not found.'],404);
    $role=preg_replace('/[\s_-]+/', '', strtolower($actor['role']));
    $targetRole=preg_replace('/[\s_-]+/', '', strtolower($target['role']));
    $permissions=json_decode($actor['permissions'] ?? '{}',true) ?: [];
    $own=hash_equals((string)$actor['id'],$id);
    $manage=$role==='masteradmin' || ($role==='admin' && $targetRole!=='masteradmin' && ($permissions[$targetRole==='admin'?'manageAdmins':($targetRole==='teacher'?'manageTeachers':'manageStudents')] ?? false)===true);
    if (!$own && !$manage) photoReply(['success'=>false,'error'=>'You cannot edit this profile.'],403);
    if ($method==='POST') {
        if ($role==='student' && ($permissions['studentBio'] ?? true)!==true) photoReply(['success'=>false,'error'=>'Profile editing is disabled for this account.'],403);
        $photo=(string)($input['photo'] ?? '');
        if (!preg_match('~^data:image/(webp|jpeg);base64,([A-Za-z0-9+/=]+)$~D',$photo,$parts) || strlen($photo)>90000) photoReply(['success'=>false,'error'=>'Use a compressed 256 by 256 profile image.'],422);
        $bytes=base64_decode($parts[2],true); $info=$bytes!==false?@getimagesizefromstring($bytes):false;
        if (!$info || $info[0]!==256 || $info[1]!==256 || !in_array($info['mime'],['image/webp','image/jpeg'],true)) photoReply(['success'=>false,'error'=>'Use a 256 by 256 WebP or JPEG image.'],422);
        $pdo->beginTransaction();
        $pdo->prepare('INSERT IGNORE INTO user_profile_photos(photo_id,user_id,photo_url) VALUES(?,?,?)')->execute([hash('sha256',$id.'|'.$photo),$id,$photo]);
        $pdo->prepare('UPDATE users SET avatar=? WHERE id=?')->execute([$photo,$id]);
        $pdo->prepare('INSERT INTO audit_logs(user_id,action) VALUES(?,?)')->execute([$actor['id'],'Updated profile photo for account '.$id]);
        $pdo->commit();
    } elseif ($method!=='GET') photoReply(['success'=>false,'error'=>'Method not allowed.'],405);
    $query=$pdo->prepare('SELECT photo_url FROM user_profile_photos WHERE user_id=? ORDER BY created_at DESC LIMIT 12');$query->execute([$id]);$history=$query->fetchAll(PDO::FETCH_COLUMN);
    if (!$history && !empty($target['avatar'])) $history=[$target['avatar']];
    photoReply(['success'=>true,'photos'=>$history]);
} catch (Throwable $error) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    photoReply(['success'=>false,'error'=>'Profile photo could not be saved. Please try again.'],500);
}
