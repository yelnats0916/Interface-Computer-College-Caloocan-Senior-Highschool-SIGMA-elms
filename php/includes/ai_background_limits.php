<?php
// Provider throttling is shared by background workers, never by page retrieval.
function sigmaBackgroundAiRetryAt(PDO $db): int {
    $query=$db->prepare('SELECT payload FROM ai_generation_ledger WHERE owner_id=? AND context_key=?');
    $query->execute(['__background_ai__',hash('sha256','provider-cooldown-v1')]);
    return (int)(json_decode($query->fetchColumn()?:'{}',true)['retryAfter']??0);
}
function sigmaPauseBackgroundAi(PDO $db,int $seconds=120): int {
    $until=max(time()+$seconds,sigmaBackgroundAiRetryAt($db));
    $db->prepare('INSERT INTO ai_generation_ledger(owner_id,context_key,payload) VALUES(?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)')
        ->execute(['__background_ai__',hash('sha256','provider-cooldown-v1'),json_encode(['retryAfter'=>$until])]);
    return $until;
}
function sigmaBackgroundAiWasLimited(Throwable $error): bool {
    return ($error instanceof SigmaSubmissionAiProviderException && $error->httpStatus===429)
        || stripos($error->getMessage(),'quota')!==false || stripos($error->getMessage(),'rate limit')!==false;
}
