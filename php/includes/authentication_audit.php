<?php
/** Server-observed authentication events; no client-supplied audit submissions. */
function sigmaRecordAuthentication(PDO $db, ?string $userId, string $event, string $outcome = 'success', string $details = ''): void {
    $payload = ['event'=>$event, 'outcome'=>$outcome, 'details'=>$details];
    do {
        $action = 'AUTH:'.json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        if (strlen($action) <= 255) break;
        $payload['details'] = mb_substr($payload['details'], 0, max(0, mb_strlen($payload['details'])-10));
    } while ($payload['details'] !== '');
    $db->prepare('INSERT INTO audit_logs(user_id,action,ip_address,user_agent) VALUES(?,?,?,?)')->execute([
        $userId ?: null, $action, $_SERVER['REMOTE_ADDR'] ?? null, substr($_SERVER['HTTP_USER_AGENT'] ?? '',0,255)
    ]);
}
