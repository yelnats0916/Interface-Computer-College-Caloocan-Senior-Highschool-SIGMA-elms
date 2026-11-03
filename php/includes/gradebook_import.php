<?php
function sigmaImportGradebookScores(PDO $db,array $actor,array $subject,array $section,array $input): int {
    if(!($db->inTransaction())||!(academicRole($actor)==='teacher'||academicAdmin($actor))||!sigmaActorPermission($actor,'teacherGrades'))throw new RuntimeException('Only an assigned grading teacher can import scores.');
    $rows=$input['rows']??null;$quarter=$input['quarter']??null;
    if(!is_array($rows)||!$rows||count($rows)>1000||!in_array($quarter,[1,2,3,4],true))throw new InvalidArgumentException('Import 1–1000 score changes for one quarter.');
    $seen=[];$updates=[];
    foreach($rows as $row){
        $student=academicStudent($db,$section,(string)($row['studentId']??''));
        $item=academicResolvedItem($db,$subject,$section,academicItem($subject,['itemId'=>(string)($row['itemId']??'')]));
        $itemQuarter=(int)preg_replace('/\D/','',(string)($item['data']['quarter']??1));
        if($itemQuarter!==$quarter)throw new InvalidArgumentException('An assessment belongs to a different quarter. Download a new template.');
        $key=$student['id'].':'.$item['id'];if(isset($seen[$key]))throw new InvalidArgumentException('The file contains a duplicate student and assessment.');$seen[$key]=true;
        $before=academicRead($db,'score',$subject,$section,$student['id'],$item['id']);
        if((string)($row['expectedRevision']??'')!==(string)($before['gradeRevision']??''))throw new RuntimeException('A grade changed after preview. Upload the file again to review the latest grades.');
        if(!empty($item['data']['quizId'])||!empty($item['data']['selectedQuizId'])||preg_match('/quiz/i',(string)($item['data']['type']??$item['data']['category']??'')))throw new InvalidArgumentException('Quiz grades are protected and cannot be changed through import.');
        if(!isset($before['score'])||$before['score']===''||!is_numeric($before['score'])||!is_finite((float)$before['score']))throw new InvalidArgumentException('Only tasks with an existing recorded grade can be changed. Blank task grades are protected.');
        if(!isset($row['score'])||$row['score']==='')throw new InvalidArgumentException('An imported correction must keep a numeric task grade.');
        $max=academicMaximum($item);$score=$row['score']??null;
        if($score!==null&&(!$max||!is_numeric($score)||!is_finite((float)$score)||$score<0||$score>$max))throw new InvalidArgumentException('A score exceeds the saved highest possible score.');
        $status=sigmaGradingStatus($row['gradingStatus']??'none');
        $submission=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
        $payload=$before??[];unset($payload['recordedAt'],$payload['gradedAt'],$payload['gradeRevision']);
        $payload=array_replace($payload,['score'=>$score===null?null:(float)$score,'maxScore'=>$max,'gradingStatus'=>$status,'attendance'=>$status==='none'?'':$status,'status'=>$status==='none'?($score===null?'Submitted':'Graded'):ucfirst($status),'feedback'=>$before['feedback']??'','attemptIdentity'=>$submission['attemptIdentity']??'']);
        $updates[]=[$student['id'],$item['id'],$payload];
    }
    foreach($updates as [$student,$item,$payload])academicWrite($db,$actor,'score',$subject,$section,$student,$item,$payload);
    return count($updates);
}
