<?php
require_once dirname(__DIR__).'/php/includes/ai_record_store.php';
function historyCheck($ok,$message){if(!$ok)throw new RuntimeException($message);}
$db=serviceSettingsPdo();$db->beginTransaction();
try{
    foreach(['student','teacher'] as $kind){
        $user='history-test-'.bin2hex(random_bytes(5));
        $db->prepare('INSERT INTO users(id,first_name,last_name,email,password,role,status) VALUES(?,?,?,?,?,?,?)')->execute([$user,'History','Test',$user.'@example.invalid','not-real',ucfirst($kind),'Active']);
        $card=['id'=>'legacy-area-card','area'=>'submissions','title'=>'First insight','evidenceIds'=>['one'],'analyses'=>[['category'=>'descriptive','actionLabel'=>'Try','text'=>'First result']]];
        $first=saveAiAnalyticsState($db,$user,$kind,['cards'=>[$card],'usedProvider'=>true],0);
        $next=$card;$next['title']='Second insight';$next['analyses'][0]['text']='Changed result';
        $second=saveAiAnalyticsState($db,$user,$kind,['cards'=>[$next],'usedProvider'=>true],$first['revision']);
        historyCheck(count($second['state']['cards'])===2,'Latest references hid retained history');
        historyCheck(count(array_unique(array_column($second['state']['cards'],'id')))===2,'Legacy IDs collide');
        $again=saveAiAnalyticsState($db,$user,$kind,$second['state'],$second['revision']);
        historyCheck(count($again['state']['cards'])===2,'Saving recovered history duplicates records');
        historyCheck(count(aiAnalyticsState($db,$user,$kind==='student'?'teacher':'student')['state']['cards'])===0,'History leaked across roles');
        lifecycleChange($db,'ai_insight_cards',aiCardId($user,$kind,$card),'remove','0000000');
        historyCheck(count(aiAnalyticsState($db,$user,$kind)['state']['cards'])===1,'Removed insight reappeared');
    }
    echo "PASS: student/teacher history recovery, unique IDs, stable saves, role isolation, and deletion preservation.\n";
}finally{$db->rollBack();}
