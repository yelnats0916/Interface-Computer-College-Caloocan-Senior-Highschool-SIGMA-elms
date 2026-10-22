<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require_once __DIR__ . '/../includes/ai_request_auth.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }
$raw = file_get_contents('php://input', false, null, 0, 32001);
if (strlen($raw) > 32000) { http_response_code(413); echo json_encode(['success' => false, 'error' => 'Too much evidence for one request.']); exit; }
require_once __DIR__ . '/../includes/analytics_ai_generation.php';
require_once __DIR__ . '/../includes/ai_generation_id.php';
require_once __DIR__ . '/../includes/ai_request_auth.php';
$aiActor = sigmaRequireAiActor([]);
try {
    $input = json_decode($raw, true) ?: [];
    require_once __DIR__ . '/../includes/academic_evidence.php';
    require_once __DIR__ . '/../includes/ai_record_store.php';
    $db=serviceSettingsPdo();
    aiInsightControls($db);
    $selector=$input['snapshot']??[];
    $snapshot=academicSnapshot($db,$aiActor,$input);
    $kind=academicRole($aiActor);$feature=($input['feature']??'analytics')==='grade_insights'?'grade_insights':'analytics';
    $input['kind']=$kind;$input['snapshot']=$snapshot;$input['feature']=$feature;
    $scopeKeys=[];foreach($snapshot['areas'] as $area)foreach($area['records'] as $record)$scopeKeys[]=$record['subjectId'].':'.$record['sectionId'];
    $scopeKeys=array_values(array_unique($scopeKeys));sort($scopeKeys);
    $context=hash('sha256',json_encode([$feature,$snapshot['scope'],$scopeKeys,$selector['quarter']??'all',$input['language']??'en']));
    // Dashboard uses one ledger across languages and contexts, enforcing a true per-account daily ceiling.
    if($feature==='analytics')$context=hash('sha256','dashboard');
    $lock='sigma-ai:'.substr(hash('sha256',$aiActor['id']),0,40);
    $q=$db->prepare('SELECT GET_LOCK(?,0)');$q->execute([$lock]);if(!(int)$q->fetchColumn())throw new RuntimeException('Analysis is already running for this account. Please wait.');
    $locked=true;
    $q=$db->prepare('SELECT payload FROM ai_generation_ledger WHERE owner_id=? AND context_key=?');$q->execute([$aiActor['id'],$context]);$ledger=json_decode($q->fetchColumn()?:'{}',true)?:[];
    $saveLedger=function()use($db,$aiActor,$context,&$ledger){$db->prepare('INSERT INTO ai_generation_ledger(owner_id,context_key,payload) VALUES(?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)')->execute([$aiActor['id'],$context,json_encode($ledger,JSON_THROW_ON_ERROR)]);};
    $day=(new DateTimeImmutable('now',new DateTimeZone('Asia/Manila')))->format('Y-m-d');
    $count=($ledger['day']??'')===$day?(int)($ledger['count']??0):0;
    $areas=[];$hashes=[];$recordHashes=[];
    foreach($snapshot['areas'] as $area){
        $hashes[$area['id']]=hash('sha256',json_encode($area));$changed=[];
        foreach($area['records'] as $record){
            $recordHash=hash('sha256',json_encode($record));$recordHashes[$area['id']][$record['id']]=$recordHash;
            if(($ledger['records'][$area['id']][$record['id']]??'')!==$recordHash)$changed[]=$record;
        }
        if($changed)$areas[]=['id'=>$area['id'],'records'=>$changed];
    }
    // Grade popups summarize their complete current scope; dashboard cards use only changed records.
    if($feature==='grade_insights'&&$areas)$areas=$snapshot['areas'];
    $fingerprint=hash('sha256',json_encode($snapshot));
    if(!$areas || ($feature==='analytics'&&$count>=3)){
        $cached=$feature==='grade_insights'?($ledger['result']??[]):[];
        if(!empty($cached['generationId'])){
            $q=$db->prepare('SELECT is_deleted FROM ai_logs WHERE id=?');$q->execute([$cached['generationId']]);$deleted=$q->fetchColumn();
            if($deleted===false||(int)$deleted)$cached['cards']=[];
            else $cached['cards']=array_values(array_filter($cached['cards']??[],function($card)use($db){$q=$db->prepare("SELECT hidden,is_deleted FROM ai_insight_controls WHERE source_type='grade' AND source_id=?");$q->execute([$card['insightSourceId']??'']);$flags=$q->fetch();return !$flags||(!$flags['hidden']&&!$flags['is_deleted']);}));
        }

        echo json_encode(['success'=>true]+$cached+['cards'=>[],'snapshot'=>$snapshot,'reason'=>$count>=3?'Daily insight limit reached.':'No new supported learning evidence.']);exit;
    }
    if(($ledger['retryAfter']??0)>time())throw new RuntimeException('Analysis is cooling down after an unsuccessful request. Please wait a few minutes.');
    $ledger['retryAfter']=time()+300;$saveLedger();
    $input['snapshot']['areas']=$areas;
    $input['maxCards']=$feature==='analytics'?min(3-$count,count($areas)):1;
    $services = require dirname(__DIR__, 2) . '/config/services.php';
    $result = generateAnalyticsAi($services, $input, function ($url, $headers, $body) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers), CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 60, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_FOLLOWLOCATION => false]);
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false || $code < 200 || $code >= 300) throw new RuntimeException($code === 429 ? 'AI quota reached. Wait before analyzing again.' : 'Analytics provider request failed. Check the saved key and model.');
        return json_decode($raw, true) ?: [];
    });
    // Determine specific insight code prefix (3 insight types):
    // 1. Cards (INSC) - Analytics Cards
    // 2. Subject (INSS) - Subject Grade Insights
    // 3. Grades (INSGR) - Overall Grades / Class Grades
    $insightType = strtolower($input['insightType'] ?? $input['scope'] ?? '');
    if (!$insightType && isset($input['snapshot']['scope'])) {
        $insightType = strtolower($input['snapshot']['scope']);
    }
    if (!$insightType && ($input['feature'] ?? '') === 'grade_insights') {
        $insightType = 'grades';
    }
    $areaId = strtolower($input['snapshot']['areas'][0]['id'] ?? '');

    if (strpos($areaId, 'subject') !== false || $insightType === 'subject' || strpos($insightType, 'subject') !== false) {
        $kind = 'insight_subject';
    } elseif (strpos($areaId, 'grade') !== false || $insightType === 'grades' || $insightType === 'overall' || strpos($insightType, 'grade') !== false) {
        $kind = 'insight_grades';
    } else {
        $kind = 'insight_cards';
    }
    $result['generationId'] = sigmaAiGenerationId($kind);
    $now=gmdate('c');
    foreach($result['cards'] as $index=>&$card){
        $card['id']=$result['generationId'].'-'.$index;$card['generationId']=$result['generationId'];$card['createdAt']=$now;
        $card['categories']=array_column($card['analyses'],'category');
        if($feature==='grade_insights')$card['insightSourceId']=$result['generationId'].':'.$index;
    }unset($card);
    $db->beginTransaction();
    if($feature==='analytics'){
        $saved=aiAnalyticsState($db,$aiActor['id'],$input['kind']);
        // Only the new cards need insertion; aiAnalyticsState retains the historical records.
        saveAiAnalyticsState($db,$aiActor['id'],$input['kind'],['cards'=>$result['cards'],'usedProvider'=>true,'lastAnalyzed'=>(int)(microtime(true)*1000)],$saved['revision']);
    }
    if($result['cards'])saveAiLog($db,['id'=>$result['generationId'],'userId'=>(string)$aiActor['id'],'feature'=>$feature,'timestamp'=>$now,
        'prompt'=>($feature==='grade_insights'?($snapshot['scope']==='subject'?'Subject Grades: ':'Class Grades: '):'Learning Insights: ').implode(', ',array_unique(array_merge(...array_map(fn($a)=>array_column($a['records'],'subject'),$snapshot['areas'])))),
        'gradeEvidenceKey'=>is_string($input['gradeEvidenceKey']??null)?substr($input['gradeEvidenceKey'],0,32000):'',
        'response'=>json_encode($result['cards']), 'model'=>$result['model'],'provider'=>$result['provider'],'keyId'=>$result['keyId'],'keyLabel'=>$result['keyLabel'],'generationId'=>$result['generationId'],'status'=>$result['status'],
        'evidenceSources'=>array_map(fn($a)=>['id'=>$a['id'],'label'=>$a['id'],'records'=>array_map(fn($r)=>array_intersect_key($r,array_flip(['id','title','subjectId','sectionId'])),$a['records'])],$areas)]);
    foreach($areas as $area)if(!$result['cards']||$feature==='grade_insights'||in_array($area['id'],array_column($result['cards'],'area'),true))foreach($area['records'] as $record)$ledger['records'][$area['id']][$record['id']]=$recordHashes[$area['id']][$record['id']];
    $ledger['day']=$day;$ledger['count']=$count+count($result['cards']);$ledger['retryAfter']=0;
    // Unchosen areas remain eligible when the day has room. Zero-card output marks the inspected facts as processed.
    foreach($areas as $area)if(!$result['cards']||$feature==='grade_insights'||in_array($area['id'],array_column($result['cards'],'area'),true))$ledger['areas'][$area['id']]=$hashes[$area['id']];
    $result['snapshot']=$snapshot;$ledger['result']=$feature==='grade_insights'?$result:[];$ledger['fingerprint']=$fingerprint;$saveLedger();
    $db->commit();
    echo json_encode(['success'=>true]+$result);

} catch (InvalidArgumentException $error) { http_response_code(400); echo json_encode(['success' => false, 'error' => $error->getMessage()]); }
catch (Throwable $error) { http_response_code(502); echo json_encode(['success' => false, 'error' => $error instanceof RuntimeException ? $error->getMessage() : 'Analytics generation is unavailable.']); }

finally { if(isset($db)&&$db->inTransaction())$db->rollBack(); if(!empty($locked)){ $q=$db->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$lock]); } }
