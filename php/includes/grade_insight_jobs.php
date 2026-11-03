<?php
require_once __DIR__.'/academic_evidence.php';
require_once __DIR__.'/grade_insight_cache.php';
require_once __DIR__.'/ai_background_limits.php';
require_once __DIR__.'/grade_insight_reports.php';

function sigmaGradeInsightJobSchema(PDO $db): void {
    static $ready=[];$key=spl_object_id($db);if(isset($ready[$key]))return;
    $db->exec("CREATE TABLE IF NOT EXISTS grade_insight_jobs (
        owner_id VARCHAR(50) NOT NULL, context_key CHAR(64) NOT NULL,
        fingerprint CHAR(64) NOT NULL, request_json LONGTEXT NOT NULL,
        state VARCHAR(16) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0,
        available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY(owner_id,context_key), KEY waiting(state,available_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $ready[$key]=true;
}

function sigmaGradeInsightContext(array $snapshot,array $selector,string $language): string {
    $keys=[];foreach($snapshot['areas'] as $area)foreach($area['records'] as $record)$keys[]=$record['subjectId'].':'.$record['sectionId'];
    $keys=array_values(array_unique($keys));sort($keys);
    return hash('sha256',json_encode(['grade_insights',$snapshot['scope'],$keys,$selector['quarter']??'all',$language]));
}

function sigmaReadOrQueueGradeInsight(PDO $db,array $actor,array $input,?array $snapshot=null): array {
    $input['feature']='grade_insights';$snapshot=$snapshot??academicSnapshot($db,$actor,$input);
    $context=sigmaGradeInsightContext($snapshot,$input['snapshot']??[],$input['language']??'en');
    $fingerprint=sigmaGradeInsightEvidenceFingerprint($snapshot);
    sigmaPrepareGradeReport($db,$actor,$input,$snapshot,$context,$fingerprint);
    $query=$db->prepare('SELECT payload FROM ai_generation_ledger WHERE owner_id=? AND context_key=?');
    $query->execute([$actor['id'],$context]);$ledger=json_decode($query->fetchColumn()?:'{}',true)?:[];
    $result=$ledger['result']??null;
    if(is_array($result)&&sigmaGradeInsightEvidenceFingerprint($result['snapshot']??[])===$fingerprint){
        if(!empty($result['generationId'])){
            $query=$db->prepare('SELECT is_deleted FROM ai_logs WHERE id=?');$query->execute([$result['generationId']]);
            $deleted=$query->fetchColumn();
            if($deleted===false||(int)$deleted)$result['cards']=[];
            else $result['cards']=array_values(array_filter($result['cards']??[],function($card)use($db){
                $query=$db->prepare("SELECT hidden,is_deleted FROM ai_insight_controls WHERE source_type='grade' AND source_id=?");
                $query->execute([$card['insightSourceId']??'']);$flags=$query->fetch();return !$flags||(!$flags['hidden']&&!$flags['is_deleted']);
            }));
        }
        return ['success'=>true]+$result+['snapshot'=>$snapshot,'cards'=>[],'state'=>'ready'];
    }
    if(!$snapshot['areas'])return ['success'=>true,'cards'=>[],'snapshot'=>$snapshot,'state'=>'empty'];
    sigmaGradeInsightJobSchema($db);
    // New evidence replaces a pending version; unchanged exhausted jobs are not
    // restarted by navigation. Workers validate the current scope again.
    $query=$db->prepare('SELECT state,fingerprint,available_at,attempts FROM grade_insight_jobs WHERE owner_id=? AND context_key=?');$query->execute([$actor['id'],$context]);
    $previous=$query->fetch(PDO::FETCH_ASSOC)?:[];$queued=($previous['fingerprint']??'')!==$fingerprint;
    $query=$db->prepare("INSERT INTO grade_insight_jobs(owner_id,context_key,fingerprint,request_json) VALUES(?,?,?,?)
        ON DUPLICATE KEY UPDATE attempts=IF(fingerprint<>VALUES(fingerprint),0,attempts),
        available_at=IF(fingerprint<>VALUES(fingerprint),UTC_TIMESTAMP(),available_at),
        state=IF(fingerprint<>VALUES(fingerprint),'pending',state),request_json=VALUES(request_json),fingerprint=VALUES(fingerprint)");
    $query->execute([$actor['id'],$context,$fingerprint,json_encode($input,JSON_THROW_ON_ERROR)]);
    $available=$queued?time():(strtotime(($previous['available_at']??'now').' UTC')?:time());
    $cooldown=sigmaBackgroundAiRetryAt($db);
    $retry=max($available,$cooldown)-time();
    // A worker failure with attempts remaining is scheduled work, not terminal.
    $state=$queued?'pending':($previous['state']??'pending');
    if($state==='failed'&&(int)($previous['attempts']??0)<3)$state='pending';
    return ['success'=>true,'cards'=>[],'snapshot'=>$snapshot,'state'=>$state,
        'reason'=>$state==='pending'&&$cooldown>time()?'provider_quota':null,
        'queued'=>$queued,'retryAfter'=>max(5,min(120,$retry))];
}

function sigmaStartGradeInsightJobs(string $ownerId='',string $contextKey=''): void {
    if(!is_callable('exec'))return;
    $worker=dirname(__DIR__).'/workers/grade-insights.php';
    if(PHP_OS_FAMILY==='Windows')return; // The scheduler remains the portable recovery path.
    $private='/home/sigma-elms/sigma-private';
    if(!is_file($worker)||!is_dir($private))return;
    $args='';
    if($ownerId!==''&&preg_match('/^[A-Za-z0-9_-]{1,50}$/',$ownerId)&&preg_match('/^[a-f0-9]{64}$/',$contextKey))
        $args=' --owner='.escapeshellarg($ownerId).' --context='.escapeshellarg($contextKey);
    @exec('nohup /usr/bin/php '.escapeshellarg($worker).$args.' >> '.escapeshellarg($private.'/grade-insights.log').' 2>&1 < /dev/null &');
}

// Derive every authorized report from one complete account snapshot. This
// private helper never broadens the public endpoint's validated selectors.
function sigmaGradeInsightScopeSnapshot(array $base,string $scope,string $subjectId='',string $sectionId='', $quarter='all'): array {
    $student=isset($base['studentId']);$rows=[];
    foreach($base['areas'] as $area)foreach($area['records'] as $record){
        if($scope==='overall'&&$student&&!isset($record['grade']))continue;
        if($scope!=='overall'&&($record['subjectId']!==$subjectId||$record['sectionId']!==$sectionId))continue;
        if(is_numeric($quarter)&&(int)($record['quarter']??0)!==(int)$quarter)continue;
        $rows[]=$record;
    }
    $base['scope']=$scope;$id=$scope==='subject'?'subject-grades':($student?'overall-grades':'class-grades');
    $base['areas']=$rows?[['id'=>$id,'records'=>array_values($rows)]]:[];
    return $base;
}

function sigmaReconcileGradeInsights(PDO $db): array {
    sigmaGradeInsightJobSchema($db);
    sigmaGradeReportSchema($db);
    require_once __DIR__.'/grade_drafts.php';sigmaEnsureGradeDraftSchema($db);
    // This small change stamp prevents every scheduler tick rebuilding unchanged
    // reports. Academic AI output does not itself dirty its source evidence.
    $parts=[];
    foreach(["SELECT COUNT(*),MAX(updated_at),SUM(CRC32(payload)) FROM academic_records WHERE record_type IN ('submission','score','teacher_feedback','release','rubric')",
        'SELECT COUNT(*),MAX(updated_at) FROM subjects', 'SELECT COUNT(*),MAX(updated_at) FROM sections',
        'SELECT COUNT(*),MAX(updated_at) FROM users','SELECT COUNT(*),SUM(revision) FROM grade_publications',
        'SELECT COUNT(*),SUM(revision) FROM grade_drafts'] as $sql)$parts[]=$db->query($sql)->fetch(PDO::FETCH_NUM);
    $stamp=hash('sha256',json_encode($parts));$owner='__grade_insight_worker__';$key=hash('sha256','reconciled-evidence-v6-summary-v1');
    $query=$db->prepare('SELECT payload FROM ai_generation_ledger WHERE owner_id=? AND context_key=?');$query->execute([$owner,$key]);
    if((json_decode($query->fetchColumn()?:'{}',true)['stamp']??'')===$stamp)return ['changed'=>false,'scopes'=>0];
    $count=0;
    $actors=$db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role) IN ('student','teacher')")->fetchAll(PDO::FETCH_ASSOC);
    foreach($actors as $actor){
        $kind=academicRole($actor);if(!sigmaActorPermission($actor,$kind==='student'?'studentGrades':'teacherGrades'))continue;
        $input=['feature'=>'grade_insights','kind'=>$kind,'language'=>'en','snapshot'=>['scope'=>'overall','quarter'=>'all']];
        $base=academicSnapshot($db,$actor,$input,true);
        foreach(['en','fil'] as $language){
        $input['language']=$language;
        if($kind==='student'){sigmaReadOrQueueGradeInsight($db,$actor,$input,sigmaGradeInsightScopeSnapshot($base,'overall'));$count++;}
        $scopes=[];foreach($base['areas'] as $area)foreach($area['records'] as $record)$scopes[$record['subjectId'].':'.$record['sectionId']]=[$record['subjectId'],$record['sectionId']];
        foreach($scopes as [$subjectId,$sectionId])foreach($kind==='student'?['all',1,2,3,4]:['all'] as $quarter){
            $scope=$kind==='student'?'subject':'class';
            $request=$input;$request['snapshot']=['scope'=>$scope,'quarter'=>$quarter,
                'areas'=>[['records'=>[['subjectId'=>$subjectId,'sectionId'=>$sectionId]]]]];
            sigmaReadOrQueueGradeInsight($db,$actor,$request,sigmaGradeInsightScopeSnapshot($base,$scope,$subjectId,$sectionId,$quarter));$count++;
        }
        }
    }
    $db->prepare('INSERT INTO ai_generation_ledger(owner_id,context_key,payload) VALUES(?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)')->execute([$owner,$key,json_encode(['stamp'=>$stamp])]);
    return ['changed'=>true,'scopes'=>$count];
}
