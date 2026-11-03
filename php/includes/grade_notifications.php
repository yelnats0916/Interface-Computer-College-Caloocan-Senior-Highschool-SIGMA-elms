<?php
require_once __DIR__.'/section_deployment_events.php';

function sigmaGradingStatus($value): string {
    $status=strtolower(trim((string)$value));
    if($status===''||$status==='graded'||$status==='submitted')$status='none';
    if($status==='excused')$status='excuse';
    if(!in_array($status,['none','missing','absent','incomplete','excuse'],true))throw new InvalidArgumentException('Choose a valid grading status.');
    return $status;
}
function sigmaGradeChanged(?array $previous,array $next): bool {
    $number=fn($value)=>$value===null||$value===''?null:(float)$value;
    if(!$previous)return $number($next['score']??null)!==null||sigmaGradingStatus($next['gradingStatus']??'none')!=='none';
    return $number($previous['score']??null)!==$number($next['score']??null)
        ||$number($previous['maxScore']??null)!==$number($next['maxScore']??null)
        ||sigmaGradingStatus($previous['gradingStatus']??$previous['attendance']??'none')!==sigmaGradingStatus($next['gradingStatus']??'none')
        ||($previous['attemptIdentity']??'')!==($next['attemptIdentity']??'');
}
/** Caller commits the score and this recipient-specific event together. */
function sigmaPersistGradeNotification(PDO $db,array $actor,array $subject,array $section,string $studentId,array $item,?array $previous,array $grade): void {
    if(!sigmaGradeChanged($previous,$grade))return;
    $revision=(int)$grade['gradeRevision'];
    $event=hash('sha256',json_encode([$subject['id'],$section['id'],$studentId,$item['id'],$revision]));
    $id='grade-event-'.$event;$name=$actor['full_name']??trim(($actor['first_name']??'').' '.($actor['last_name']??''));
    $title=$item['data']['title']??$item['data']['name']??'Assessment';
    $label=$grade['status']??'Graded';$score=$grade['score']??null;
    $number=fn($value)=>$value===null||$value===''?null:(float)$value;
    $statusOnly=$previous && $number($previous['score']??null)===$number($score) && $number($previous['maxScore']??null)===$number($grade['maxScore']??null);
    $noticeTitle=$statusOnly||(!$previous&&$score===null)?'Submission Status Updated':($previous?'Grade Updated':'Submission Graded');
    if(($grade['source']??'')==='quiz-auto')$name='Automatic Scoring';
    $notification=['id'=>$id,'type'=>'submission-graded','title'=>$noticeTitle,
        'body'=>$title.' — '.($score===null?'Score cleared':('Score: '.$score.' / '.($grade['maxScore']??''))).'. Status: '.$label.'.',
        'senderId'=>(string)$actor['id'],'senderName'=>$name?:'Teacher','senderRole'=>$actor['role'],'senderType'=>'user',
        'icon'=>'fa-solid fa-award','recipientId'=>$studentId,'read'=>false,'timestamp'=>$grade['recordedAt'],
        'gradeRevision'=>$revision,'assignmentScope'=>['subjectId'=>$subject['id'],'subjectName'=>$subject['name'],'section'=>$section['name']],
        'target'=>['subjectId'=>$subject['id'],'itemId'=>$item['id'],'topicIdx'=>$item['topicIdx'],'itemIdx'=>$item['itemIdx'],'tab'=>'assessments','materialTitle'=>$title,
            'studentId'=>$studentId,'selectedStudent'=>$studentId,'section'=>$section['name'],'sectionId'=>$section['id'],'quarter'=>$item['data']['quarter']??''],
        'recipients'=>[['id'=>$studentId,'role'=>'Student','readAt'=>null]]];
    $db->prepare('INSERT IGNORE INTO notification_records(id,notification_id,target_role,actor_id,payload) VALUES(?,?,?,?,?)')
        ->execute([$event,$id,'student',(string)$actor['id'],json_encode($notification,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
}

/** One durable event per submitted attempt, addressed only to this subject's assigned teachers. */
function sigmaPersistSubmissionNotification(PDO $db,array $actor,array $subject,array $section,string $studentId,string $itemId,?array $previous,array $submission): void {
    $identity=(string)($submission['attemptIdentity']??$submission['submittedAt']??'');
    if($identity===''||($previous && (string)($previous['attemptIdentity']??$previous['submittedAt']??'')===$identity))return;
    $item=academicItems($subject)['assessment:'.$itemId]??null;if(!$item)return;
    $title=$item['data']['title']??$item['data']['name']??'Assessment';
    $name=$actor['full_name']??trim(($actor['first_name']??'').' '.($actor['last_name']??''));
    $teachers=$db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='teacher'")->fetchAll(PDO::FETCH_ASSOC);
    $write=$db->prepare('INSERT IGNORE INTO notification_records(id,notification_id,target_role,actor_id,payload) VALUES(?,?,?,?,?)');
    foreach($teachers as $teacher){
        if(!academicTeacher($section,$teacher,$subject))continue;
        $recipient=(string)$teacher['id'];$event=hash('sha256',json_encode(['assessment-submitted',$subject['id'],$section['id'],$studentId,$itemId,$identity,$recipient]));$id='submission-event-'.$event;
        $notice=['id'=>$id,'type'=>'assessment-submitted','title'=>'Assessment Submitted',
            'body'=>$name.' submitted '.$title.' in '.$subject['name'].' / '.$section['name'].'.',
            'senderId'=>(string)$actor['id'],'senderName'=>$name,'senderRole'=>$actor['role'],'senderType'=>'user','icon'=>'fa-solid fa-file-circle-check',
            'recipientId'=>$recipient,'recipients'=>[['id'=>$recipient,'role'=>'Teacher','readAt'=>null]],'read'=>false,'timestamp'=>$submission['submittedAt']??gmdate('c'),
            'assignmentScope'=>['subjectId'=>$subject['id'],'subjectName'=>$subject['name'],'section'=>$section['name']],
            'target'=>['subjectId'=>$subject['id'],'itemId'=>$itemId,'topicIdx'=>$item['topicIdx'],'itemIdx'=>$item['itemIdx'],'tab'=>'assessments','materialTitle'=>$title,'studentId'=>$studentId,'selectedStudent'=>$studentId,'section'=>$section['name'],'sectionId'=>$section['id'],'quarter'=>$item['data']['quarter']??'']];
        $write->execute([$event,$id,'teacher',(string)$actor['id'],json_encode($notice,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    }
}
