<?php
require_once dirname(__DIR__) . '/includes/data_provenance.php';
header('Content-Type: application/json'); header('Cache-Control: no-store');
require_once __DIR__ . '/../includes/ai_record_store.php';
restrictServiceOrigin();
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sigma-Actor');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS')exit;
// Like analytics generation, browser-owned evidence is development-only until server login is connected.
if(!in_array($_SERVER['REMOTE_ADDR']??'', ['127.0.0.1','::1'],true) || !in_array(strtolower(parse_url('http://'.($_SERVER['HTTP_HOST']??''),PHP_URL_HOST)?:''),['localhost','127.0.0.1','[::1]'],true)){
    http_response_code(403); echo json_encode(['success'=>false,'error'=>'Database-backed account authentication is required before remote AI record access.']);exit;
}
try{
    $db=serviceSettingsPdo(); $actor=lifecycleActor();
    $q=$db->prepare('SELECT role FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)=\'active\'');$q->execute([$actor]);$role=strtolower(preg_replace('/[\s_-]+/','',$q->fetchColumn()?:''));
    if(!$role){
        echo json_encode(['success'=>false,'code'=>'account_not_synced','error'=>'AI records are unavailable until this account is synced to the database and active.']);
        exit;
    }
    $admin=in_array($role,['admin','masteradmin'],true);
    $method=$_SERVER['REQUEST_METHOD']??'';
    $input=$_GET;
    if($method==='POST'){
        $raw=file_get_contents('php://input',false,null,0,512001);if(strlen($raw)>512000)throw new InvalidArgumentException('Too much AI record data.');
        $input=json_decode($raw,true,64,JSON_THROW_ON_ERROR); sigmaRequireRealRecords($input);
    }elseif($method!=='GET')throw new InvalidArgumentException('Unsupported request method.');
    $action=$input['action']??'';
    aiInsightControls($db);
    if($action==='latest_grade_insight'&&$method==='POST'){
        $owner=$input['userId']??$actor;
        if(!$admin && $owner!==$actor)throw new RuntimeException('This insight belongs to another account.');
        $evidence=$input['evidenceKey']??'';$candidates=$input['candidateGenerationIds']??[];
        $legacyPrompt=$input['legacyPrompt']??'';
        if(!is_string($legacyPrompt)||strlen($legacyPrompt)>2000)throw new InvalidArgumentException('Invalid insight scope.');
        if(!is_string($evidence)||strlen($evidence)>32000||!is_array($candidates)||count($candidates)>20)throw new InvalidArgumentException('Invalid insight evidence.');
        $q=$db->prepare("SELECT id,payload FROM ai_logs WHERE user_id=? AND feature='grade_insights' AND is_deleted=0 ORDER BY created_at DESC,id DESC");$q->execute([$owner]);$latest=null;
        foreach($q->fetchAll() as $row){
            $log=json_decode($row['payload'],true);
            if(!in_array($log['status']??'',['Success','Fallback Used'],true))continue;
            $exact=isset($log['gradeEvidenceKey'])&&hash_equals($log['gradeEvidenceKey'],$evidence);
            $legacy=!isset($log['gradeEvidenceKey'])&&(in_array($log['generationId']??'',$candidates,true)||($legacyPrompt!==''&&($log['prompt']??'')===$legacyPrompt));
            if(!$exact&&!$legacy)continue;
            $cards=json_decode($log['response']??'',true);
            foreach(is_array($cards)?$cards:[] as $index=>$card){
                if(!is_array($card['analyses']??null)||!$card['analyses'])continue;
                $control=$db->prepare("SELECT hidden,is_deleted FROM ai_insight_controls WHERE source_type='grade' AND source_id=?");$control->execute([$row['id'].':'.$index]);$flags=$control->fetch();
                if(!empty($flags['hidden'])||!empty($flags['is_deleted']))continue;
                $card['generationId']=$log['generationId']??null;$card['createdAt']=$log['timestamp']??null;$card['insightSourceId']=$row['id'].':'.$index;
                if(!$latest||strtotime($card['createdAt']??'')>strtotime($latest['createdAt']??''))$latest=$card;
            }
        }
        echo json_encode(['success'=>true,'card'=>$latest]);
    }elseif($action==='grade_insight_view'&&$method==='POST'){
        $owner=$input['userId']??$actor;
        if($owner!==$actor || $role!=='student')throw new RuntimeException('Only the student can identify their displayed insight.');
        $generation=$input['generationId']??'';$view=$input['viewKey']??'';
        if(!is_string($view)||strlen($view)>1000||!is_string($generation)||!preg_match('/^[A-Z]{3,8}-\d{4}-\d{4,}$/',$generation))throw new InvalidArgumentException('Invalid displayed insight.');
        $q=$db->prepare("SELECT payload FROM ai_logs WHERE user_id=? AND feature='grade_insights' AND is_deleted=0 ORDER BY created_at DESC");$q->execute([$owner]);$found=false;
        foreach($q->fetchAll() as $row){$log=json_decode($row['payload'],true);if(($log['generationId']??'')===$generation&&in_array($log['status']??'',['Success','Fallback Used'],true)){$found=true;break;}}
        if(!$found)throw new RuntimeException('The displayed insight must be saved before it can be synced.');
        $db->prepare('INSERT INTO ai_grade_insight_views(user_id,view_key,generation_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE generation_id=VALUES(generation_id)')->execute([$owner,hash('sha256',$view),$generation]);
        echo json_encode(['success'=>true]);
    }elseif($action==='manage_insights'&&$method==='POST'){
        if(!$admin)throw new RuntimeException('Only administrators can manage insights.');
        $operation=$input['operation']??'';$items=$input['items']??[];
        if(!in_array($operation,['hide','show','delete'],true)||!is_array($items)||count($items)<1||count($items)>100)throw new InvalidArgumentException('Invalid insight selection.');
        $db->beginTransaction();
        try{
            foreach($items as $item){
                $type=$item['sourceType']??'';$id=$item['sourceId']??'';
                if(!is_string($id)||strlen($id)>191)throw new InvalidArgumentException('Invalid insight.');
                if($type==='dashboard'){
                    $q=$db->prepare('SELECT user_id FROM ai_insight_cards WHERE id=? AND is_deleted=0');$q->execute([$id]);$owner=$q->fetchColumn();
                }elseif($type==='grade'){
                    $parts=explode(':',$id);$index=array_pop($parts);$logId=implode(':',$parts);
                    if(!ctype_digit($index))throw new InvalidArgumentException('Invalid insight index.');
                    $q=$db->prepare("SELECT user_id,payload FROM ai_logs WHERE id=? AND feature='grade_insights' AND is_deleted=0");$q->execute([$logId]);$logRow=$q->fetch();
                    $log=$logRow?json_decode($logRow['payload'],true):null;$cards=$log?json_decode($log['response']??'',true):null;
                    $owner=isset($cards[(int)$index]['analyses'])?$logRow['user_id']:false;
                }else throw new InvalidArgumentException('Invalid insight type.');
                if(!$owner)throw new RuntimeException('Insight no longer available. Reload and try again.');
                $q=$db->prepare('INSERT INTO ai_insight_controls(source_type,source_id,user_id,hidden,is_deleted,changed_by) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE hidden=VALUES(hidden),is_deleted=GREATEST(is_deleted,VALUES(is_deleted)),changed_by=VALUES(changed_by)');
                $q->execute([$type,$id,$owner,$operation==='show'?0:1,$operation==='delete'?1:0,$actor]);
            }
            $db->commit();
        }catch(Throwable $error){if($db->inTransaction())$db->rollBack();throw $error;}
        echo json_encode(['success'=>true]);exit;
    }
    if($action==='report' && $method==='GET'){
        if(!$admin)throw new RuntimeException('Only administrators can read insight reports.');
        $users=$db->query("SELECT id,full_name,first_name,last_name,role,avatar FROM users WHERE is_deleted=0 AND LOWER(REPLACE(role,' ','')) IN ('student','teacher') ORDER BY full_name,id")->fetchAll();
        $owners=[];
        $controls=[];
        foreach($db->query('SELECT source_type,source_id,hidden,is_deleted FROM ai_insight_controls')->fetchAll() as $control)$controls[$control['source_type'].':'.$control['source_id']]=$control;
        $currentGradeViews=[];
        foreach($db->query('SELECT user_id,generation_id FROM ai_grade_insight_views')->fetchAll() as $view)$currentGradeViews[$view['user_id']][$view['generation_id']]=true;
        $gradeCards=[];
        foreach($db->query("SELECT id,user_id,payload FROM ai_logs WHERE feature='grade_insights' AND is_deleted=0 ORDER BY created_at DESC,id DESC")->fetchAll() as $record){
            $log=json_decode($record['payload'],true);
            if(!is_array($log)||!in_array($log['status']??'', ['Success','Fallback Used'],true))continue;
            $cards=json_decode($log['response']??'',true);
            if(!is_array($cards))continue;
            foreach($cards as $index=>$card){
                if(!is_array($card)||!is_array($card['analyses']??null))continue;
                $control=$controls['grade:'.$record['id'].':'.$index]??[];
                if(!empty($control['is_deleted']))continue;
                $card['sourceType']='grade';$card['sourceId']=$record['id'].':'.$index;$card['hidden']=!empty($control['hidden']);
                $card['id']=($log['generationId']??$log['id']).'-'.$index;
                $card['generationId']=$log['generationId']??null;
                $card['isCurrentStudentView']=!empty($currentGradeViews[$record['user_id']][$card['generationId']??'']);
                $card['createdAt']=$log['timestamp']??null;
                $card['reportCategory']=str_starts_with($log['prompt']??'', 'Subject Grades:')?'subject':'grade';
                $card['reportSource']=$card['reportCategory']==='subject'?'subject-grades-view':'grades-page';
                $card['sourceLabel']=$log['prompt']??'';
                $sourceRecords=$log['evidenceSources'][0]['records']??[];
                $card['subject']=implode(', ',array_unique(array_filter(array_column($sourceRecords,'title'))));
                if($card['subject']===''&&preg_match('/^(?:Subject Grades:|Class Grades:)\s*(.+?)(?:\s*\(|$)/',$log['prompt']??'', $match))$card['subject']=$match[1];
                $gradeCards[$record['user_id']][$card['id']]=$card;
            }
        }
        foreach($users as $user){
            $kind=strtolower($user['role']);
            $result=aiAnalyticsState($db,$user['id'],$kind);
            $q=$db->prepare('SELECT id,payload FROM ai_insight_cards WHERE user_id=? AND kind=? AND is_deleted=0 ORDER BY created_at DESC,id DESC');$q->execute([$user['id'],$kind]);
            $cards=[];
            foreach($q->fetchAll() as $stored){
                $card=json_decode($stored['payload'],true);$control=$controls['dashboard:'.$stored['id']]??[];
                if(!is_array($card)||!empty($control['is_deleted']))continue;
                $card['sourceType']='dashboard';$card['sourceId']=$stored['id'];$card['hidden']=!empty($control['hidden']);$cards[]=$card;
            }
            // Dashboard cards are a different source from View Grades and GWA insights.
            foreach($cards as &$dashboardCard){$dashboardCard['reportCategory']='analytics';$dashboardCard['reportSource']='dashboard';}
            unset($dashboardCard);
            $generationIds=array_filter(array_column($cards,'generationId'));
            foreach($gradeCards[$user['id']]??[] as $card){
                if(!empty($card['generationId'])&&in_array($card['generationId'],$generationIds,true))continue;
                $cards[]=$card;
            }
            $owners[]=['id'=>$user['id'],'name'=>$user['full_name']?:trim($user['first_name'].' '.$user['last_name']),'role'=>$kind,'avatar'=>$user['avatar']??null,'cards'=>$cards,'lastAnalyzed'=>$result['state']['lastAnalyzed']??null];
        }
        echo json_encode(['success'=>true,'users'=>$owners]);
    }elseif($action==='insight_timestamp' && in_array($method,['GET','POST'],true)){
        $owner=$input['userId']??$actor;
        if(!$admin&&$owner!==$actor)throw new RuntimeException('This insight belongs to another account.');
        $generation=$input['generationId']??'';
        $sourceId=$input['sourceId']??'';
        $analyses=$input['analyses']??null;
        if(!is_string($generation)||strlen($generation)>128)throw new InvalidArgumentException('Invalid generation ID.');
        if(!is_string($sourceId)||strlen($sourceId)>191)throw new InvalidArgumentException('Invalid insight source.');
        $q=$db->prepare("SELECT id,payload FROM ai_logs WHERE user_id=? AND feature='grade_insights' AND is_deleted=0 ORDER BY created_at ASC,id ASC");
        $q->execute([$owner]);$timestamp=null;$hidden=false;$deleted=false;
        foreach($q->fetchAll() as $row){
            $log=json_decode($row['payload'],true);
            if(!in_array($log['status']??'', ['Success','Fallback Used'],true))continue;
            $matches=$generation!==''&&($log['generationId']??'')===$generation;
            if(!$matches&&$generation===''&&is_array($analyses)&&count($analyses)>0){
                $cards=json_decode($log['response']??'',true);
                foreach(is_array($cards)?$cards:[] as $card){
                    if(is_array($card)&&($card['analyses']??null)==$analyses){$matches=true;break;}
                }
            }
            if($matches){
                $timestamp=$log['timestamp']??null;
                $exactSource=str_starts_with($sourceId,$row['id'].':');
                $qControl=$db->prepare($exactSource
                    ? "SELECT hidden,is_deleted FROM ai_insight_controls WHERE source_type='grade' AND source_id=?"
                    : "SELECT hidden,is_deleted FROM ai_insight_controls WHERE source_type='grade' AND source_id LIKE ?");
                $qControl->execute([$exactSource?$sourceId:$row['id'].':%']);
                foreach($qControl->fetchAll() as $control){$hidden=$hidden||!empty($control['hidden']);$deleted=$deleted||!empty($control['is_deleted']);}
                break;
            }
        }
        echo json_encode(['success'=>true,'timestamp'=>$timestamp,'hidden'=>$hidden,'deleted'=>$deleted]);
    }elseif($action==='logs'){
        if(!$admin)throw new RuntimeException('Only administrators can read all AI logs.');
        echo json_encode(['success'=>true,'logs'=>aiRecordLogs($db)]);
    }elseif($action==='save_log'&&$method==='POST'){
        $log=$input['log']??[];if(!$admin&&($log['userId']??'')!==$actor)throw new RuntimeException('This log belongs to another account.');
        saveAiLog($db,$log);echo json_encode(['success'=>true]);
    }elseif(in_array($action,['state','save_state'],true)){
        $user=$input['userId']??$actor;$kind=$input['kind']??'';
        if(!$admin&&($user!==$actor||$kind!==$role))throw new RuntimeException('This insight belongs to another account.');
        if(!in_array($kind,['student','teacher'],true)||!is_string($user)||strlen($user)>50)throw new InvalidArgumentException('Invalid insight owner.');
        $result=$action==='save_state'&&$method==='POST'?saveAiAnalyticsState($db,$user,$kind,$input['state']??[],(int)($input['revision']??-1)):aiAnalyticsState($db,$user,$kind);
        echo json_encode(['success'=>true]+$result);
    }else throw new InvalidArgumentException('Unsupported AI record action.');
}catch(Throwable $e){http_response_code($e instanceof InvalidArgumentException?400:409);echo json_encode(['success'=>false,'error'=>$e->getMessage()]);}
