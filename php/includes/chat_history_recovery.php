<?php
require_once __DIR__.'/ai_record_store.php';

/** Recover only the incident's pre-fix history; never assign today's date or a guessed provider. */
function sigmaHistoryTimestamp(array $message, int $updatedAt): ?string {
    $zone=new DateTimeZone('Asia/Manila');
    if (!empty($message['timestamp'])) {
        try { $date=new DateTimeImmutable($message['timestamp']); } catch (Throwable $error) { return null; }
    } else {
        if (!is_string($message['stamp']??null)) return null;
        $stamp=preg_replace('/[\s\x{00A0}\x{202F}]+/u',' ',trim($message['stamp']));
        if (!preg_match('/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([0-9]{1,2}),? ([0-9]{1,2}):([0-9]{2}) (AM|PM)$/i',$stamp,$m)) return null;
        $reference=(new DateTimeImmutable('@'.intdiv($updatedAt,1000)))->setTimezone($zone);
        $date=null;
        foreach ([(int)$reference->format('Y'),(int)$reference->format('Y')-1] as $year) {
            $candidate=DateTimeImmutable::createFromFormat('!M j Y g:i A',"$m[1] $m[2] $year $m[3]:$m[4] ".strtoupper($m[5]),$zone);
            $errors=DateTimeImmutable::getLastErrors();
            if ($candidate && (!$errors || (!$errors['warning_count']&&!$errors['error_count'])) && $candidate->getTimestamp()<=$reference->getTimestamp()+86400 && $reference->getTimestamp()-$candidate->getTimestamp()<366*86400) { $date=$candidate; break; }
        }
        if (!$date) return null;
    }
    // This migration repairs the October 22 incident, not newer server-recorded requests.
    if ($date >= new DateTimeImmutable('2026-10-23T00:00:00+08:00') || $date < new DateTimeImmutable('2020-01-01T00:00:00Z')) return null;
    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
}
function sigmaRecoveredChatRecords(string $owner, array $conversations): array {
    if (count($conversations)>20) throw new InvalidArgumentException('Recover at most 20 conversations per request.');
    $records=[];
    foreach ($conversations as $conversation) {
        $id=$conversation['id']??'';$updated=$conversation['updatedAt']??0;$messages=$conversation['messages']??[];
        if (!is_string($id)||!preg_match('/^[A-Za-z0-9_-]{1,128}$/D',$id)||!is_numeric($updated)||!is_array($messages)||count($messages)>500) throw new InvalidArgumentException('Invalid saved conversation.');
        $question=null;
        foreach ($messages as $index=>$message) {
            if (!is_array($message)||!is_string($message['text']??null)||strlen($message['text'])>30000) throw new InvalidArgumentException('Invalid saved message.');
            if (($message['role']??'')==='user') { $question=$message; continue; }
            if (($message['role']??'')!=='assistant'||!$question||trim($message['text'])===''||trim($question['text'])==='') continue;
            $timestamp=sigmaHistoryTimestamp($message,(int)$updated);
            if ($timestamp) {
                $records[]=['id'=>'recovered-chat-'.hash('sha256',$owner."\n".$id."\n".$index),'userId'=>$owner,'feature'=>'sigmabot','timestamp'=>$timestamp,
                    'prompt'=>$question['text'],'response'=>$message['text'],'model'=>'Not recorded','status'=>'Recovered',
                    'actionDescription'=>'Recovered saved conversation request',
                    'conversationId'=>$id,'conversationTitle'=>is_string($conversation['title']??null) ? mb_substr(trim($conversation['title']),0,80) : '',
                    'historyRecovery'=>['source'=>'Saved browser conversation','conversationId'=>$id,'timestampPrecision'=>'minute','providerVerified'=>false,'recoveredAt'=>gmdate('c')],
                    'messages'=>[['role'=>'user','text'=>$question['text'],'timestamp'=>sigmaHistoryTimestamp($question,(int)$updated)??$timestamp],['role'=>'assistant','text'=>$message['text'],'timestamp'=>$timestamp]]];
                $last=count($records)-1;
                if(is_string($message['model']??null)&&trim($message['model'])!==''&&strlen($message['model'])<=160&&$message['model']!=='Not recorded'){
                    $records[$last]['model']=$message['model'];
                    $records[$last]['historyRecovery']['modelSource']='Saved assistant message';
                    if(in_array($message['provider']??'',['gemini','groq'],true))$records[$last]['provider']=$message['provider'];
                }
            }
            $question=null;
        }
    }
    return $records;
}
function sigmaRecoverChatHistory(PDO $db,string $owner,array $conversations): array {
    $records=sigmaRecoveredChatRecords($owner,$conversations);$added=0;
    $own=!$db->inTransaction();if($own)$db->beginTransaction();
    try {
        $existing=$db->prepare("SELECT id,payload FROM ai_logs WHERE user_id=? AND feature='sigmabot'");$existing->execute([$owner]);$known=[];
        foreach($existing->fetchAll(PDO::FETCH_ASSOC) as $row)$known[$row['id']]=json_decode($row['payload'],true);
        $updated=0;
        // Titles are conversation metadata. Update only matching exchanges owned by this account;
        // never replace the recorded prompt, response, timestamp or verified generation result.
        foreach($conversations as $conversation){
            $title=is_string($conversation['title']??null)?mb_substr(trim($conversation['title']),0,80):'';
            $question=null;
            foreach($conversation['messages'] as $index=>$message){
                if(($message['role']??'')==='user'){$question=$message;continue;}
                if(($message['role']??'')!=='assistant'||!$question)continue;
                $recoveredId='recovered-chat-'.hash('sha256',$owner."\n".$conversation['id']."\n".$index);
                $id=isset($known[$recoveredId])?$recoveredId:($message['generationId']??'');
                $log=$known[$id]??null;
                if(!$log||($log['prompt']??'')!==$question['text']||($log['response']??'')!==$message['text']){$question=null;continue;}
                $before=$log;
                if($title!==''){$log['conversationId']=$conversation['id'];$log['conversationTitle']=$title;}
                if(isset($log['historyRecovery'])&&is_string($message['model']??null)&&trim($message['model'])!==''&&strlen($message['model'])<=160&&$message['model']!=='Not recorded'){
                    $log['model']=$message['model'];
                    $log['historyRecovery']['modelSource']='Saved assistant message';
                    if(in_array($message['provider']??'',['gemini','groq'],true))$log['provider']=$message['provider'];
                }
                if($log!==$before){
                    $update=$db->prepare('UPDATE ai_logs SET payload=? WHERE id=? AND user_id=? AND is_deleted=0');
                    $update->execute([json_encode($log,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),$id,$owner]);
                    $updated+=$update->rowCount();$known[$id]=$log;
                }
                $question=null;
            }
        }
        foreach($records as $record){
            if(isset($known[$record['id']])||aiWasPurged($db,'ai_logs',$record['id']))continue;
            $duplicate=false;
            foreach($known as $log){if(($log['prompt']??null)===$record['prompt']&&($log['response']??null)===$record['response']&&abs(strtotime($log['timestamp']??'')-strtotime($record['timestamp']))<60){$duplicate=true;break;}}
            if($duplicate)continue;
            saveAiLog($db,$record);$known[$record['id']]=$record;$added++;
        }
        if($own)$db->commit();
    } catch(Throwable $error){if($own&&$db->inTransaction())$db->rollBack();throw $error;}
    return ['recoveredRequests'=>$added,'completeExchanges'=>count($records),'updatedMetadata'=>$updated,'provider'=>'Not recorded'];
}
