<?php
require_once dirname(__DIR__) . '/php/includes/ai_record_store.php';
function verify($condition,$message){if(!$condition)throw new RuntimeException($message);}
$db=serviceSettingsPdo();$db->beginTransaction();
try{
    $user='lifecycle-test-'.bin2hex(random_bytes(5));
    $db->prepare('INSERT INTO users(id,first_name,last_name,email,password,role,status) VALUES(?,?,?,?,?,?,?)')->execute([$user,'Test','Account',$user.'@example.invalid','not-a-real-password','Student','Active']);
    $card=['id'=>'insight-test','area'=>'tasks','title'=>'Recorded test insight','evidenceIds'=>['test'],'analyses'=>[['category'=>'descriptive','actionLabel'=>'Try','text'=>'Test only']]];
    $state=['cards'=>[$card],'fingerprint'=>'unchanged-test','processedAreas'=>['tasks'=>'test'],'usedProvider'=>true];
    $saved=saveAiAnalyticsState($db,$user,'student',$state,0);$cardId=aiCardId($user,'student',$card);
    $log=['id'=>$user.'-log','userId'=>$user,'feature'=>'analytics','status'=>'Success','timestamp'=>gmdate('c'),'prompt'=>'Test insight','response'=>'Test only','source'=>['kind'=>'student','cardId'=>$card['id'],'signature'=>json_encode($card)]];
    saveAiLog($db,$log);
    lifecycleChange($db,'ai_insight_cards',$cardId,'remove','0000000');
    verify(count(aiAnalyticsState($db,$user,'student')['state']['cards'])===0,'Removed card still visible');
    verify(aiAnalyticsState($db,$user,'student')['state']['fingerprint']==='unchanged-test','Removal cleared change tracking');
    $q=$db->prepare('SELECT is_deleted,deleted_by FROM ai_logs WHERE id=?');$q->execute([$log['id']]);verify(!$q->fetch()['is_deleted'],'Removing a card deleted its log');
    saveAiAnalyticsState($db,$user,'student',$state,$saved['revision']);
    verify(!aiAnalyticsState($db,$user,'student')['state']['cards'],'A stale card resurrected through save');
    lifecycleChange($db,'ai_insight_cards',$cardId,'restore','0000000');
    verify(count(aiAnalyticsState($db,$user,'student')['state']['cards'])===1,'Restore did not reuse card');
    lifecycleChange($db,'ai_logs',$log['id'],'remove','0000000');
    saveAiLog($db,$log);$q->execute([$log['id']]);verify((bool)$q->fetch()['is_deleted'],'Log retry undid deletion');
    verify(count(aiAnalyticsState($db,$user,'student')['state']['cards'])===1,'Deleting a log removed its card');
    lifecycleChange($db,'ai_logs',$log['id'],'restore','0000000');
    try{lifecycleChange($db,'ai_logs',$log['id'],'purge','0000000','DELETE '.$log['id']);throw new RuntimeException('Active log purged');}catch(RuntimeException $e){verify($e->getMessage()!=='Active log purged','Active record must be soft-deleted first');}
    lifecycleChange($db,'ai_logs',$log['id'],'remove','0000000');
    lifecycleChange($db,'ai_logs',$log['id'],'purge','0000000','DELETE '.$log['id']);saveAiLog($db,$log);$q->execute([$log['id']]);verify(!$q->fetch(),'Purged log resurrected through legacy import');
    lifecycleChange($db,'users',$user,'remove','0000000');verify(count(lifecycleList($db,'users'))>0,'Deleted account not retrievable');
    lifecycleChange($db,'users',$user,'restore','0000000');
    $quizId=$user.'-quiz';
    $db->prepare('INSERT INTO quizzes(id,title) VALUES(?,?)')->execute([$quizId,'Lifecycle fixture only']);
    lifecycleChange($db,'quizzes',$quizId,'remove','0000000');
    lifecycleChange($db,'users',$user,'remove','0000000');
    $all=lifecycleRemovedRecords($db,'all');
    verify(count(array_filter($all,fn($record)=>$record['id']===$user&&$record['recordType']==='users'))===1,'All view omitted a removed account');
    verify(count(array_filter($all,fn($record)=>$record['id']===$quizId&&$record['recordType']==='quizzes'))===1,'All view omitted a removed quiz');
    lifecycleChange($db,'users',$user,'restore','0000000');
    lifecycleChange($db,'quizzes',$quizId,'restore','0000000');
    lifecycleChange($db,'quizzes',$quizId,'remove','0000000');
    lifecycleChange($db,'quizzes',$quizId,'purge','0000000','DELETE '.$quizId);
    try{$db->prepare('INSERT INTO quizzes(id,title) VALUES(?,?)')->execute([$quizId,'Stale browser replay']);throw new RuntimeException('Purged quiz resurrected');}catch(PDOException $expected){}
    $events=array_values(array_filter(lifecycleEvents($db),fn($event)=>$event['recordId']===$quizId));
    verify(in_array('restore',array_column($events,'action'),true),'Restoration event missing from audit history');
    verify(in_array('purge',array_column($events,'action'),true),'Permanent deletion erased audit history');
    verify($events[0]['actor']['id']==='0000000'&&!empty($events[0]['actor']['name']),'Audit actor attribution missing');
    try{lifecycleChange($db,'users','0000000','remove','0000000');throw new RuntimeException('Master account removed');}catch(RuntimeException $e){verify($e->getMessage()!=='Master account removed','Master protection failed');}
    try{saveAiAnalyticsState($db,$user,'student',$state,0);throw new RuntimeException('Stale revision accepted');}catch(RuntimeException $e){verify($e->getMessage()!=='Stale revision accepted','Revision conflict was not detected');}
    try{lifecycleChange($db,'system_service_settings','1','remove','0000000');throw new RuntimeException('Internal settings deleted');}catch(InvalidArgumentException $expected){}
    echo "PASS: soft delete, restore, confirmed purge, independent card/log actions, no resurrection, fingerprints preserved, stale-write prevention, internal table protection.\n";
}finally{$db->rollBack();}
