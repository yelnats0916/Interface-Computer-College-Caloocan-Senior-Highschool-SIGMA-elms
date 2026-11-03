<?php
require_once __DIR__.'/academic_evidence.php';

/** Build recipient-specific events from authenticated assignments, never browser recipients. */
function sigmaGradeWorkflowNotices(array $actor,array $subject,array $section,array $sections,array $users,string $event,string $revision,array $context=[]): array {
    $notices=[];$review=in_array($event,['quarter-grades-shared'],true);
    foreach($users as $user){
        if((string)$user['id']===(string)$actor['id']||!empty($user['is_deleted'])||strtolower($user['status']??'active')!=='active')continue;
        $role=academicRole($user);$teacher=$role==='teacher'&&academicTeacher($section,$user,$subject);
        $adviser=$role==='teacher'&&gradeClassAdviser($sections,$section,$user);
        $student=$role==='student'&&gradeStudent($section,$user);
        if($event==='quarter-grades-published')$allowed=($student&&in_array((string)$user['id'],array_map('strval',$context['studentIds']??[]),true))||$teacher;
        elseif($event==='quarter-grades-shared')$allowed=$adviser;
        elseif($event==='grade-corrections-requested')$allowed=$teacher;
        elseif(($context['kind']??'')==='assessment')$allowed=academicRole($actor)==='student'?$teacher:($student&&(string)$user['id']===(string)($context['studentId']??''));
        else $allowed=($teacher||$adviser)&&((gradeClassAdviser($sections,$section,$actor)&&$teacher)||(academicTeacher($section,$actor,$subject)&&$adviser));
        if(!$allowed)continue;
        $id='workflow-'.hash('sha256',json_encode([$event,$subject['id'],$section['id'],$revision,(string)$user['id']]));
        $quarter=(int)($context['quarter']??1);$mode=$student?'student':($review||($event==='grade-record-comment'&&$adviser)?'review':'share');
        $title=['quarter-grades-shared'=>'Grades Ready for Review','quarter-grades-published'=>'Quarter Grades Published','grade-corrections-requested'=>'Grade Corrections Requested','grade-record-comment'=>'New Private Grade Comment','assessment-comment'=>'New Private Assessment Comment'][$event]??'Grade Update';
        $target=['gradeRecord'=>['year'=>$section['school_year'],'section'=>$section['name'],'subject'=>$subject['name'],'quarter'=>$quarter,'mode'=>$mode,'selected'=>['subject'=>$subject['name'],'sectionName'=>$section['name']],'focusComments'=>str_contains($event,'comment')||$event==='grade-corrections-requested']];
        if(($context['kind']??'')==='assessment'){
            $item=academicItems($subject)['assessment:'.($context['itemId']??'')]??null;
            if(!$item)continue;
            $target=['subjectId'=>$subject['id'],'section'=>$section['name'],'studentId'=>$context['studentId'],'selectedStudent'=>$context['studentId'],'itemId'=>$item['id'],'topicIdx'=>$item['topicIdx'],'itemIdx'=>$item['itemIdx'],'tab'=>'assessments','focusComments'=>true];
        }
        $notice=['id'=>$id,'type'=>$event,'title'=>$title,'body'=>$subject['name'].' / '.$section['name'].(isset($context['quarter'])?' / Quarter '.$quarter:'').(!empty($context['text'])?' — '.mb_substr($context['text'],0,160):''),
            'senderId'=>(string)$actor['id'],'senderName'=>$actor['full_name']??trim(($actor['first_name']??'').' '.($actor['last_name']??'')),'senderRole'=>$actor['role'],'senderType'=>'user',
            'recipientId'=>(string)$user['id'],'recipients'=>[['id'=>(string)$user['id'],'role'=>$user['role'],'readAt'=>null]],'read'=>false,'timestamp'=>gmdate('c'),
            'assignmentScope'=>['subjectId'=>$subject['id'],'subjectName'=>$subject['name'],'section'=>$section['name']],'target'=>$target];
        $notices[]=['role'=>$role,'notification'=>$notice];
    }
    return $notices;
}
function sigmaPersistWorkflowNotices(PDO $db,array $notices): void {
    $write=$db->prepare('INSERT IGNORE INTO notification_records(id,notification_id,target_role,actor_id,payload) VALUES(?,?,?,?,?)');
    foreach($notices as $entry){$n=$entry['notification'];$write->execute([hash('sha256',$n['id']),$n['id'],$entry['role'],$n['senderId'],json_encode($n,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);}
}
