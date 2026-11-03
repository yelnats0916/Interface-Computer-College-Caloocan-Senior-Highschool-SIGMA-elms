<?php
// A compact database view for the administrator's Evaluation and Feedback page.
function sigmaSubmissionAiRecords(PDO $db, array $actor): array {
    if (!academicAdmin($actor)) throw new RuntimeException('Only administrators can review all submission AI results.');
    $rows=$db->query("SELECT r.record_type,r.subject_id,r.section_id,r.student_id,r.item_id,r.payload,r.actor_id,
        u.first_name,u.middle_name,u.last_name,t.first_name AS teacher_first,t.last_name AS teacher_last,
        s.name AS subject_name,c.name AS section_name
        FROM academic_records r JOIN users u ON u.id=r.student_id AND u.is_deleted=0
        JOIN subjects s ON s.id=r.subject_id AND s.is_deleted=0
        JOIN sections c ON c.id=r.section_id AND c.is_deleted=0
        LEFT JOIN users t ON t.id=r.actor_id
        WHERE r.record_type IN ('evaluation','feedback') ORDER BY r.updated_at DESC LIMIT 500")->fetchAll(PDO::FETCH_ASSOC);
    $records=[];
    foreach($rows as $row){
        $payload=json_decode($row['payload'],true)?:[];$result=$payload['result']??[];
        $id=$result['generationId']??$result['evaluationId']??'';
        if(!preg_match('/^(FDBK|EVAL)-\d{4}-\d{4,}$/',$id))continue;
        $feedback=$row['record_type']==='feedback';
        $records[]=['id'=>$id,'userId'=>(string)$row['student_id'],
            'name'=>trim($row['first_name'].' '.$row['middle_name'].' '.$row['last_name']),'role'=>'Student',
            'requestedBy'=>trim(($row['teacher_first']??'').' '.($row['teacher_last']??''))?:'Administrator',
            'requestedById'=>(string)$row['actor_id'],'section'=>$row['section_name'],'subjectId'=>$row['subject_id'],
            'materialId'=>$row['item_id'],'assessmentTitle'=>$payload['assessmentTitle']??$row['item_id'],
            'subject'=>$row['subject_name'].' - '.($payload['assessmentTitle']??$row['item_id']),
            'type'=>$feedback?'Submission Feedback':'Rubric Evaluation','status'=>'Generated',
            'score'=>$feedback?null:($result['score']??null),'timestamp'=>strtotime($payload['recordedAt']??'')*1000,
            'date'=>date('M j, Y',strtotime($payload['recordedAt']??'now')),
            'details'=>json_encode($feedback?($result['feedback']??[]):$result,JSON_UNESCAPED_UNICODE),
            'feedbackItems'=>$feedback?($result['feedback']??[]):[]];
    }
    return $records;
}
