<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../includes/service_vault_auth.php';
require_once __DIR__ . '/../includes/application_auth.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
require_once dirname(__DIR__, 2) . '/config/database.php';
try {
    $actor = sigmaRequireApplicationActor($pdo);
    $role = preg_replace('/[\s_-]+/', '', strtolower($actor['role']));
    $admin = in_array($role, ['admin', 'masteradmin', 'administrator'], true);
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($method === 'POST') {
        // Identity and timestamps come exclusively from the verified session and database clock.
        $stmt = $pdo->prepare('INSERT INTO application_presence(token_hash,user_id,online_since,last_seen) VALUES(?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE online_since=IF(last_seen<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 3 MINUTE),UTC_TIMESTAMP(),online_since),last_seen=UTC_TIMESTAMP()');
        $stmt->execute([hash('sha256', sigmaApplicationToken()), $actor['id']]);
        $pdo->exec('DELETE FROM application_presence WHERE last_seen<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 DAY)');
    } elseif ($method !== 'GET') { http_response_code(405); echo json_encode(['success'=>false,'error'=>'Unsupported method.']); exit; }
    if ($method === 'GET' && !$admin) { http_response_code(403); echo json_encode(['success'=>false,'error'=>'Online account lists are available to administrators.']); exit; }
    $users = [];
    if ($admin) {
        $query = $pdo->query("SELECT u.id,u.first_name,u.last_name,u.full_name,u.role,u.avatar,UNIX_TIMESTAMP()*1000-TIMESTAMPDIFF(SECOND,MIN(p.online_since),UTC_TIMESTAMP())*1000 AS online_since_ms,UNIX_TIMESTAMP()*1000-TIMESTAMPDIFF(SECOND,MAX(p.last_seen),UTC_TIMESTAMP())*1000 AS last_seen_ms FROM application_presence p JOIN grade_sync_tokens s ON s.token_hash=p.token_hash AND s.expires_at>UTC_TIMESTAMP() JOIN users u ON u.id=p.user_id AND u.id=s.user_id AND u.is_deleted=0 AND LOWER(u.status)='active' AND u.totp_enabled=1 AND u.terms_accepted=1 WHERE p.last_seen>=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 3 MINUTE) GROUP BY u.id,u.first_name,u.last_name,u.full_name,u.role,u.avatar ORDER BY MIN(p.online_since),u.id");
        foreach ($query->fetchAll(PDO::FETCH_ASSOC) as $user) $users[] = [
            'id'=>$user['id'],'uid'=>$user['id'],'firstName'=>$user['first_name'],'lastName'=>$user['last_name'],
            'name'=>$user['full_name'],'role'=>$user['role'],'avatar'=>$user['avatar'],
            'onlineSince'=>(int)$user['online_since_ms'],'lastSeen'=>(int)$user['last_seen_ms']
        ];
    }
    echo json_encode(['success'=>true,'users'=>$users,'serverNow'=>(int)$pdo->query('SELECT UNIX_TIMESTAMP()*1000')->fetchColumn()]);
} catch (Throwable $error) { error_log('SIGMA presence error: '.$error->getMessage()); http_response_code(503); echo json_encode(['success'=>false,'error'=>'Online status is unavailable.']); }
