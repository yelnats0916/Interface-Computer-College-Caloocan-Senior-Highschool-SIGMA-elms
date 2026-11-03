<?php
if(PHP_SAPI!=='cli')exit(1);
require_once dirname(__DIR__).'/includes/service_secrets.php';
require_once dirname(__DIR__).'/includes/analytics_runner.php';
require_once dirname(__DIR__).'/includes/grade_insight_jobs.php';
require_once dirname(__DIR__).'/includes/ai_background_limits.php';
$db=serviceSettingsPdo();$name='sigma-grade-insight-worker';
$targetOwner='';$targetContext='';
foreach(array_slice($argv,1) as $argument){
    if(str_starts_with($argument,'--owner='))$targetOwner=substr($argument,8);
    elseif(str_starts_with($argument,'--context='))$targetContext=substr($argument,10);
}
$targeted=$targetOwner!==''&&preg_match('/^[A-Za-z0-9_-]{1,50}$/',$targetOwner)&&preg_match('/^[a-f0-9]{64}$/',$targetContext);
$query=$db->prepare('SELECT GET_LOCK(?,0)');$query->execute([$name]);if(!(int)$query->fetchColumn())exit;
try {
    sigmaGradeInsightJobSchema($db);
    // Reconciliation scans every account and scope. Run it only on scheduled
    // invocations; page requests should process only their requested report.
    $scheduled=in_array('--scheduled',$argv,true);
    $reconcileOnly=in_array('--reconcile-only',$argv,true);
    $summary=($scheduled||$reconcileOnly)?sigmaReconcileGradeInsights($db):['changed'=>false,'scopes'=>0];
    echo json_encode(['at'=>gmdate('c')]+$summary+($targeted?['requested'=>true]:[])).PHP_EOL;
    if($reconcileOnly)exit;
    $deadline=time()+($scheduled?20:30);
    $maxJobs=$scheduled?100:($targeted?1:8);
    for($i=0;$i<$maxJobs&&time()<$deadline;$i++){
        if(sigmaBackgroundAiRetryAt($db)>time())break;
        // Requested student/teacher reports precede speculative copies.
        // Within each group, published student summaries come first.
        $sql="SELECT * FROM grade_insight_jobs WHERE state IN ('pending','failed') AND attempts<3 AND available_at<=UTC_TIMESTAMP()";
        $params=[];
        if($targeted){$sql.=' AND owner_id=? AND context_key=?';$params=[$targetOwner,$targetContext];}
        $sql.=" ORDER BY (JSON_UNQUOTE(JSON_EXTRACT(request_json,'$.language'))='en') DESC,(JSON_UNQUOTE(JSON_EXTRACT(request_json,'$.snapshot.scope'))='overall') DESC,(JSON_UNQUOTE(JSON_EXTRACT(request_json,'$.snapshot.scope'))='class') DESC,(JSON_UNQUOTE(JSON_EXTRACT(request_json,'$.snapshot.quarter'))='all') DESC,available_at,updated_at LIMIT 1";
        $query=$db->prepare($sql);$query->execute($params);$job=$query->fetch(PDO::FETCH_ASSOC);
        if(!$job)break;
        $input=json_decode($job['request_json'],true)?:[];
        $delay=60;
        try {
            $query=$db->prepare("SELECT * FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)='active'");$query->execute([$job['owner_id']]);$actor=$query->fetch(PDO::FETCH_ASSOC);
            if(!$actor)throw new InvalidArgumentException('Account unavailable.');
            $result=sigmaRunAnalytics($db,$actor,$input,true);
            $state='complete';$attempts=(int)$job['attempts'];
            echo json_encode(['at'=>gmdate('c'),'context'=>$job['context_key'],'state'=>'complete','cards'=>count($result['cards']??[])]).PHP_EOL;
        } catch(Throwable $error) {
            $state='failed';$attempts=$error instanceof InvalidArgumentException?3:(int)$job['attempts']+1;
            if(sigmaBackgroundAiWasLimited($error)){$state='pending';$attempts=(int)$job['attempts'];$delay=max(120,sigmaPauseBackgroundAi($db)-time());}
            elseif(!($error instanceof InvalidArgumentException)&&$attempts>=3){$state='pending';$attempts=0;$delay=900;}
            error_log('Background grade insight: '.$error->getMessage());
        }
        $query=$db->prepare('UPDATE grade_insight_jobs SET state=?,attempts=?,available_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND) WHERE owner_id=? AND context_key=? AND fingerprint=?');
        $query->execute([$state,$attempts,$delay,$job['owner_id'],$job['context_key'],$job['fingerprint']]);
    }
} finally {$query=$db->prepare('SELECT RELEASE_LOCK(?)');$query->execute([$name]);}
