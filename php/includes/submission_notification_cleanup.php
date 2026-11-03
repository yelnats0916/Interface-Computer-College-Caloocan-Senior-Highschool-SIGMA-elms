<?php
// Retain the database event and its read receipts; retire only an matching legacy copy of that submitted attempt.
function sigmaRetireDuplicateSubmissionNotifications(PDO $db, bool $apply=false): array {
    $rows=$db->query("SELECT id,payload FROM notification_records WHERE target_role='teacher'")->fetchAll(PDO::FETCH_ASSOC);
    $canonical=[];$legacy=[];
    foreach($rows as $row){$n=json_decode($row['payload'],true);if(!is_array($n)||!empty($n['supersededBy']))continue;$row['notice']=$n;
        if(($n['type']??'')==='assessment-submitted'&&str_starts_with($n['id']??'','submission-event-'))$canonical[]=$row;
        elseif(($n['title']??'')==='New Task Submission'&&str_starts_with($n['id']??'','submission_'))$legacy[]=$row;
    }
    $matches=[];
    foreach($legacy as $old){$n=$old['notice'];foreach($canonical as $saved){$c=$saved['notice'];$t=$c['target']??[];
        if((string)($n['senderId']??'')!==(string)($c['senderId']??''))continue;
        $normalize=fn($v)=>strtolower(trim(preg_replace('/^(card|subj|gen)[-_]/i','',(string)$v)));
        if($normalize($n['assignmentScope']['subjectId']??'')!==$normalize($c['assignmentScope']['subjectId']??'')||$normalize($n['assignmentScope']['section']??'')!==$normalize($c['assignmentScope']['section']??''))continue;
        $marker='_mat_'.($t['itemId']??'').'_std_'.($t['studentId']??'').'_';
        if(empty($t['itemId'])||empty($t['studentId'])||!str_contains($n['id'],$marker))continue;
        if(!preg_match('/_(\d+)_([0-9]{4}-[0-9]{2}-[0-9]{2}T[^_]+)$/',$n['id'],$parts))continue;
        $oldTime=strtotime($parts[2]);$newTime=strtotime($c['timestamp']??'');
        if($oldTime===false||$newTime===false||abs($oldTime-$newTime)>5)continue;
        $matches[$old['id']][]=$saved;
    }}
    // Legacy browser timestamps can precede the server commit by a few seconds.
    $matches=array_filter($matches,fn($candidates)=>count($candidates)===1);
    if($apply&&$matches){$db->beginTransaction();try{
        $update=$db->prepare('UPDATE notification_records SET payload=? WHERE id=?');
        $copy=$db->prepare('INSERT IGNORE INTO notification_receipts(notification_id,user_id,read_at) VALUES(?,?,?)');
        $read=$db->prepare('SELECT user_id,read_at FROM notification_receipts WHERE notification_id=?');
        foreach($legacy as $old){if(empty($matches[$old['id']]))continue;$n=$old['notice'];$n['supersededBy']=$matches[$old['id']][0]['notice']['id'];
            $read->execute([$old['id']]);$receipts=$read->fetchAll(PDO::FETCH_ASSOC);
            foreach($matches[$old['id']] as $saved){$recipients=array_map('strval',array_column($saved['notice']['recipients']??[],'id'));foreach($receipts as $receipt)if(in_array((string)$receipt['user_id'],$recipients,true))$copy->execute([$saved['id'],$receipt['user_id'],$receipt['read_at']]);}
            $update->execute([json_encode($n,JSON_THROW_ON_ERROR),$old['id']]);
        }$db->commit();}catch(Throwable $e){$db->rollBack();throw $e;}}
    return ['duplicates'=>count($matches),'applied'=>$apply];
}
