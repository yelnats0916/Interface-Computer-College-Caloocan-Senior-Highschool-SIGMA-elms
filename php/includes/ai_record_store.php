<?php
require_once __DIR__ . '/record_lifecycle.php';
require_once __DIR__ . '/record_creation_numbers.php';
require_once __DIR__ . '/activity_audit.php';

function aiInsightControls(PDO $db): void {
    static $ready=false;if($ready)return;
    $db->exec("CREATE TABLE IF NOT EXISTS ai_grade_insight_views (
        user_id VARCHAR(50) NOT NULL,view_key CHAR(64) NOT NULL,generation_id VARCHAR(128) NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(user_id,view_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS ai_insight_controls (
        source_type VARCHAR(24) NOT NULL,source_id VARCHAR(191) NOT NULL,user_id VARCHAR(50) NOT NULL,
        hidden TINYINT(1) NOT NULL DEFAULT 0,is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        changed_by VARCHAR(50) NOT NULL,changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(source_type,source_id),KEY owner_lookup(user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    try {
        $db->exec("ALTER TABLE ai_insight_controls CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    } catch (Throwable $e) {}
    $ready=true;
}

function aiCardId(string $user, string $kind, array $card): string {
    return hash('sha256', $user . '\n' . $kind . '\n' . ($card['id'] ?? '') . '\n' . json_encode($card, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}
function aiWasPurged(PDO $db, string $table, string $id): bool {
    $q = $db->prepare("SELECT COUNT(*) FROM record_lifecycle_events WHERE table_name=? AND record_id=? AND action='purge'"); $q->execute([$table, $id]);
    return (bool)$q->fetchColumn();
}
function saveAiLog(PDO $db, array $log): void {
    if (!is_string($log['id'] ?? null) || strlen($log['id']) > 128 || !is_string($log['userId'] ?? null) || strlen($log['userId']) > 50
        || !in_array($log['feature'] ?? '', ['sigmabot','analytics','quiz','submission_evaluation','submission_feedback','grade_insights'], true)
        || !in_array($log['status'] ?? '', ['Success','Failed','Fallback Used','Recovered'], true)) throw new InvalidArgumentException('Invalid AI log.');
    // Accept public request metadata only, never service credentials.
    if (isset($log['generationId']) && (!is_string($log['generationId']) || !preg_match('/^[A-Z]{3,8}-\\d{4}-\\d{4,}$/', $log['generationId']))) throw new InvalidArgumentException('Invalid AI generation ID.');
    $allowed = ['id','userId','feature','timestamp','prompt','response','actionDescription','model','status','generationId','provider','keyId','keyLabel','evidenceSources','source','messages','gradeEvidenceKey','gradeViewKey','historyRecovery','conversationId','conversationTitle'];
    $log = array_intersect_key($log, array_flip($allowed));
    $payload = json_encode($log, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if (strlen($payload) > 128000) throw new InvalidArgumentException('AI log is too large.');
    if (aiWasPurged($db, 'ai_logs', $log['id'])) return;
    // Retries and legacy imports must not edit, restore, or resurrect an existing log.
    $own = !$db->inTransaction();
    if ($own) $db->beginTransaction();
    try {
        $insert = $db->prepare('INSERT IGNORE INTO ai_logs(id,user_id,feature,payload) VALUES(?,?,?,?)');
        $insert->execute([$log['id'], $log['userId'], $log['feature'], $payload]);
        if ($insert->rowCount() === 1) {
            $features = ['sigmabot'=>'SIGMA Chat','analytics'=>'Learning Insights','quiz'=>'Assessment Generation',
                'submission_evaluation'=>'Submission Evaluation','submission_feedback'=>'Submission Feedback','grade_insights'=>'Grade Insights'];
            $details = 'AI feature: '.$features[$log['feature']]."\nRequest ID: ".($log['generationId'] ?? $log['id'])
                ."\nModel: ".($log['model'] ?? 'Not recorded')."\nStatus: ".$log['status'];
            $recovered=($log['status']==='Recovered');
            if($recovered)$details.="\nOriginal request time: ".$log['timestamp']."\nSource: Saved browser conversation; provider and tokens were not recorded.";
            sigmaRecordActivity($db, $log['userId'], ($recovered?'Recovered ':'Used ').$features[$log['feature']], 'AI Assistant', $details);
        }
        if ($own) $db->commit();
    } catch (Throwable $error) {
        if ($own && $db->inTransaction()) $db->rollBack();
        throw $error;
    }
}
function aiAnalyticsState(PDO $db, string $user, string $kind): array {
    aiInsightControls($db);
    $q = $db->prepare('SELECT payload, revision FROM ai_analytics_state WHERE user_id=? AND kind=?'); $q->execute([$user,$kind]); $row=$q->fetch();
    $state = $row ? json_decode($row['payload'], true) : ['cards'=>[]];
    unset($state['cardRefs']); $state['cards']=[];
    // State references once pointed only at the latest version; retain account history.
    $q=$db->prepare("SELECT c.id,c.payload FROM ai_insight_cards c LEFT JOIN ai_insight_controls v ON v.source_type='dashboard' AND v.source_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci WHERE c.user_id=? AND c.kind=? AND c.is_deleted=0 AND COALESCE(v.hidden,0)=0 AND COALESCE(v.is_deleted,0)=0 ORDER BY c.created_at DESC,c.id DESC");
    $q->execute([$user,$kind]);
    $rows=$q->fetchAll(); $counts=[];
    foreach($rows as $record){
        $card=json_decode($record['payload'],true);
        if(is_array($card)&&is_string($card['id']??null))$counts[$card['id']]=($counts[$card['id']]??0)+1;
    }
    foreach($rows as $record){
        $card=json_decode($record['payload'],true);
        if(!is_array($card)||!is_string($card['id']??null))continue;
        if(($counts[$card['id']]??0)>1){
            $card['_historyOriginalId']=$card['id'];
            $card['id']=substr($card['id'],0,90).'-'.substr($record['id'],0,32);
        }
        $state['cards'][]=$card;
    }
    return ['state'=>$state, 'revision'=>(int)($row['revision'] ?? 0), 'exists'=>(bool)$row];
}
function saveAiAnalyticsState(PDO $db, string $user, string $kind, array $state, int $revision): array {
    if (!in_array($kind,['student','teacher'],true) || strlen(json_encode($state))>256000 || !is_array($state['cards']??null) || count($state['cards'])>100) throw new InvalidArgumentException('Invalid analytics state.');
    $own=!$db->inTransaction(); if($own)$db->beginTransaction();
    try {
        $db->prepare('INSERT IGNORE INTO ai_analytics_state(user_id,kind,payload) VALUES(?,?,?)')->execute([$user,$kind,'{"cards":[]}']);
        $q=$db->prepare('SELECT revision FROM ai_analytics_state WHERE user_id=? AND kind=? FOR UPDATE'); $q->execute([$user,$kind]);
        if ((int)$q->fetchColumn()!==$revision) throw new RuntimeException('Analytics changed in another session. Reload before analyzing again.');
        $refs=[];
        foreach($state['cards'] as $card) {
            if(is_string($card['_historyOriginalId']??null)){
                $card['id']=$card['_historyOriginalId'];
                unset($card['_historyOriginalId']);
            }
            if(!is_array($card) || !is_string($card['id']??null) || strlen($card['id'])>128 || !is_array($card['analyses']??null)) throw new InvalidArgumentException('Invalid insight card.');
            $id=aiCardId($user,$kind,$card); $refs[]=$id;
            if(aiWasPurged($db,'ai_insight_cards',$id))continue;
            $payload=json_encode($card,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
            $db->prepare('INSERT IGNORE INTO ai_insight_cards(id,user_id,kind,card_id,signature,payload) VALUES(?,?,?,?,?,?)')->execute([$id,$user,$kind,$card['id'],hash('sha256',$payload),$payload]);
        }
        $state=array_intersect_key($state,array_flip(['fingerprint','generationDay','generatedCount','insightSignatures','processedAreas','lastAnalyzed','nextAnalysis','usedProvider','schemaVersion','attemptFingerprint','failedFingerprint','retryNotBefore']));
        $state['cardRefs']=$refs;
        $db->prepare('UPDATE ai_analytics_state SET payload=?,revision=revision+1 WHERE user_id=? AND kind=?')->execute([json_encode($state,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$user,$kind]);
        if($own)$db->commit();
        return aiAnalyticsState($db,$user,$kind);
    }catch(Throwable $e){if($own&&$db->inTransaction())$db->rollBack();throw $e;}
}
function aiRecordLogs(PDO $db, bool $exportAll = false): array {
    $logs=[];
    foreach($db->query('SELECT id,payload,is_deleted,deleted_at,deleted_by FROM ai_logs ORDER BY created_at DESC' . ($exportAll ? '' : ' LIMIT 2000'))->fetchAll() as $row){
        $log=json_decode($row['payload'],true); if(!is_array($log))continue;
        $log['creationNumber']=sigmaTableCreationNumber($db,'ai_logs',(string)$row['id']);
        $log['isDeleted']=(bool)$row['is_deleted']; $log['deletedAt']=$row['deleted_at']; $log['deletedBy']=$row['deleted_by'];
        if(!empty($log['source']['signature'])){
            $card=json_decode($log['source']['signature'],true);
            if(is_array($card)){
                $id=aiCardId($log['userId'],$log['source']['kind'],$card);
                $q=$db->prepare('SELECT is_deleted,deleted_at,deleted_by FROM ai_insight_cards WHERE id=?'); $q->execute([$id]); $c=$q->fetch();
                if (!$c) {
                    $q=$db->prepare("SELECT created_at AS deleted_at,actor_id AS deleted_by,1 AS is_deleted FROM record_lifecycle_events WHERE table_name='ai_insight_cards' AND record_id=? ORDER BY id DESC LIMIT 1");
                    $q->execute([$id]); $c=$q->fetch();
                }
                $log['cardRecordId']=$id; $log['cardRemoved']=!$c || (bool)$c['is_deleted'];
                $log['cardRemovedAt']=$c['deleted_at']??null; $log['cardRemovedBy']=$c['deleted_by']??null;
            }
        }
        $logs[]=$log;
    }
    return $logs;
}

/** Dashboard data contains no prompts, replies, account identities, or conversation titles. */
function aiRecordUsage(PDO $db): array {
    $rows=[];
    foreach($db->query('SELECT id,payload FROM ai_logs ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC) as $row){
        $log=json_decode($row['payload'],true);if(!is_array($log))continue;
        $summary=array_intersect_key($log,array_flip(['id','generationId','feature','provider','model','status','timestamp','usageExcluded']));
        $summary['id']=$row['id'];
        $summary['tokens']=isset($log['historyRecovery'])?null:(is_numeric($log['tokens']??null)?(float)$log['tokens']:ceil((mb_strlen($log['prompt']??'')+mb_strlen($log['response']??''))/4));
        $rows[]=$summary;
    }
    return $rows;
}
