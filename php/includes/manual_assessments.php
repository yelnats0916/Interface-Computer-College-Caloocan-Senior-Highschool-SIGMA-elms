<?php
require_once __DIR__.'/academic_evidence.php';

function manualAssessmentDefinition(array $input): array {
    $title=trim(preg_replace('/\s+/u',' ',(string)($input['title']??'')));
    $max=$input['max']??null;$quarter=$input['quarter']??null;$category=$input['category']??'';
    if(!$title||mb_strlen($title)>160)throw new InvalidArgumentException('Enter an assessment title of up to 160 characters.');
    if(!is_numeric($max)||floor((float)$max)!=(float)$max||$max<1||$max>100)throw new InvalidArgumentException('HPS must be a whole number from 1 to 100.');
    if(!is_int($quarter)||$quarter<1||$quarter>4)throw new InvalidArgumentException('Select a valid quarter.');
    if(!in_array($category,['ww','perf. task','qa'],true))throw new InvalidArgumentException('Select a valid grade component.');
    return ['title'=>$title,'max'=>(int)$max,'points'=>(int)$max,'quarter'=>$quarter,'category'=>$category];
}

function manualAssessmentRows(PDO $db,array $actor): array {
    $student=academicRole($actor)==='student';$scopes=[];$items=[];
    $q=$db->query("SELECT * FROM academic_records WHERE record_type='manual_assessment' ORDER BY updated_at,item_id");
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
        $scopeKey=$row['subject_id'].':'.$row['section_id'];
        if(!array_key_exists($scopeKey,$scopes)){
            try{$scopes[$scopeKey]=academicScope($db,$actor,$row['subject_id'],$row['section_id'],$student?'studentGrades':'teacherGrades');}
            catch(RuntimeException|InvalidArgumentException $error){$scopes[$scopeKey]=null;}
        }
        if(!$scopes[$scopeKey])continue;
        [$subject,$section]=$scopes[$scopeKey];
        $item=json_decode($row['payload'],true);if(!is_array($item))continue;
        $item['id']=$row['item_id'];$item['offline']=true;$item['subjectId']=$subject['id'];$item['section']=$section['name'];
        $item['sectionId']=$section['id'];$item['schoolYear']=$section['school_year'];$item['scores']=[];$item['statuses']=[];
        $scores=$db->prepare("SELECT student_id,payload FROM academic_records WHERE record_type='manual_score' AND subject_id=? AND section_id=? AND item_id=?".($student?' AND student_id=?':''));
        $args=[$subject['id'],$section['id'],$row['item_id']];if($student)$args[]=(string)$actor['id'];$scores->execute($args);
        foreach($scores->fetchAll(PDO::FETCH_ASSOC) as $score){
            $saved=json_decode($score['payload'],true)?:[];
            $item['scores'][$score['student_id']]=$saved['score']??'';
            $item['statuses'][$score['student_id']]=$saved['status']??'';
        }
        $items[]=$item;
    }
    return $items;
}

function manualAssessmentSave(PDO $db,array $actor,array $input,?array &$savedScore=null,?array &$savedAssessment=null): ?string {
    $savedScore=null;$savedAssessment=null;
    if(!academicAdmin($actor)&&academicRole($actor)!=='teacher')throw new RuntimeException('Only the assigned teacher can change manual assessments.');
    [$subject,$section]=academicScope($db,$actor,(string)($input['subjectId']??''),(string)($input['section']??''),'teacherGrades');
    $action=$input['action']??'';$id=(string)($input['id']??'');
    if(!preg_match('/^offline-[a-f0-9-]{36}$/i',$id))throw new InvalidArgumentException('Invalid manual assessment identifier.');
    if(!in_array($action,['create','update','score','delete'],true))throw new InvalidArgumentException('Invalid manual assessment action.');
    $db->beginTransaction();$record=null;
    try{
        // Lock the definition for score edits and HPS changes so concurrent saves cannot exceed HPS.
        $current=academicRead($db,'manual_assessment',$subject,$section,'',$id);
        if($action==='create'){
            $definition=manualAssessmentDefinition($input);
            if($current){
                foreach($definition as $key=>$value)if(($current[$key]??null)!==$value)throw new RuntimeException('This assessment was already created. Reopen it to edit.');
                $record=$current;
            }else{
                $definition+=['id'=>$id,'offline'=>true,'createdAt'=>gmdate('c'),'date'=>academicDay()];
                academicWrite($db,$actor,'manual_assessment',$subject,$section,'',$id,$definition);
                $record=$definition;
            }
        }else{
            if(!$current)throw new RuntimeException('Assessment no longer exists. Refresh the gradebook.');
            if($action==='update'){
                $definition=manualAssessmentDefinition($input);
                if($definition['category']!==$current['category']||$definition['quarter']!==$current['quarter'])throw new InvalidArgumentException('Edit the assessment in its original component and quarter.');
                $q=$db->prepare("SELECT payload FROM academic_records WHERE record_type='manual_score' AND subject_id=? AND section_id=? AND item_id=?");$q->execute([$subject['id'],$section['id'],$id]);
                foreach($q->fetchAll(PDO::FETCH_COLUMN) as $raw){$score=json_decode($raw,true)['score']??null;if(is_numeric($score)&&$score>$definition['max'])throw new InvalidArgumentException('HPS cannot be lower than an existing student score.');}
                $record=array_replace($current,$definition);
                academicWrite($db,$actor,'manual_assessment',$subject,$section,'',$id,$record);
            }elseif($action==='score'){
                $student=academicStudent($db,$section,(string)($input['studentId']??''));$value=$input['score']??null;$status=(string)($input['status']??'');
                if($value!==null&&$value!==''&&(!is_numeric($value)||floor((float)$value)!=(float)$value||$value<0||$value>$current['max']))throw new InvalidArgumentException('The score must be a whole number between 0 and HPS.');
                if(!in_array($status,['','missing','absent','incomplete','excuse'],true))throw new InvalidArgumentException('Invalid score status.');
                $saved=['score'=>$value===null||$value===''?'':(int)$value,'status'=>$status];
                academicWrite($db,$actor,'manual_score',$subject,$section,(string)$student['id'],$id,$saved);
                $savedScore=['id'=>$id,'subjectId'=>$subject['id'],'sectionId'=>$section['id'],
                    'studentId'=>(string)$student['id']]+$saved;
            }else{
                $q=$db->prepare("DELETE FROM academic_records WHERE record_type IN ('manual_assessment','manual_score') AND subject_id=? AND section_id=? AND item_id=?");$q->execute([$subject['id'],$section['id'],$id]);
            }
        }
        if($action==='create'||$action==='update'){
            $record['id']=$id;$record['offline']=true;$record['subjectId']=$subject['id'];
            $record['section']=$section['name'];$record['sectionId']=$section['id'];
            $record['schoolYear']=$section['school_year'];$record['scores']=[];$record['statuses']=[];
            $q=$db->prepare("SELECT student_id,payload FROM academic_records WHERE record_type='manual_score' AND subject_id=? AND section_id=? AND item_id=?");
            $q->execute([$subject['id'],$section['id'],$id]);
            foreach($q->fetchAll(PDO::FETCH_ASSOC) as $scoreRow){
                $score=json_decode($scoreRow['payload'],true)?:[];
                $record['scores'][$scoreRow['student_id']]=$score['score']??'';
                $record['statuses'][$scoreRow['student_id']]=$score['status']??'';
            }
            $savedAssessment=$record;
        }
        sigmaRecordActivity($db,(string)$actor['id'],'Saved manual assessment '.$action,'Grades',academicText($subject['name'].' / '.$section['name'],160));
        $db->commit();return $id;
    }catch(Throwable $error){if($db->inTransaction())$db->rollBack();throw $error;}
}
