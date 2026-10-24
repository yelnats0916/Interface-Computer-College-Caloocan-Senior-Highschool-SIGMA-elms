<?php
require_once __DIR__.'/academic_evidence.php';

function sigmaAssignedClassrooms(PDO $db, array $actor): array {
    $student=academicRole($actor)==='student';
    if (!$student && academicRole($actor)!=='teacher') throw new RuntimeException('Classroom access required.');
    $subjects=$db->query("SELECT * FROM subjects WHERE is_deleted=0 AND LOWER(status)='published'")->fetchAll(PDO::FETCH_ASSOC);
    $sections=[];$assigned=[];$permitted=[];
    foreach($db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status) IN ('deployed','published','active') ORDER BY created_at DESC,id DESC")->fetchAll(PDO::FETCH_ASSOC) as $row){
        $matches=[];
        foreach($subjects as $subject){
            if(academicSectionSubjects($row,$subject)&&($student?gradeStudent($row,$actor):academicTeacher($row,$actor,$subject))){
                $matches[]=$subject['name'];$assigned[$subject['id']]=$subject;
                if($student)foreach(academicItems($subject) as $item)if(academicRelease($db,$subject,$row,$item,(string)$actor['id']))$permitted[$subject['id']][$item['id']]=true;
            }
        }
        if(!$matches)continue;
        $teachers=array_values(array_filter(gradeList($row['teachers']??''),fn($teacher)=>$student||gradeMatches($teacher,$actor)));
        $sections[]=[
            'id'=>(string)$row['id'],'name'=>$row['name'],'grade'=>$row['grade_level'],'gradeLevel'=>$row['grade_level'],
            'room'=>$row['room'],'schoolYear'=>$row['school_year'],'startTime'=>$row['start_time'],'endTime'=>$row['end_time'],
            'days'=>array_values(array_filter(array_map('trim',explode(',',$row['days']??'')))),'daysFormatted'=>$row['days']??'',
            'schedule'=>$row['schedule'],'dailySchedules'=>gradeList($row['daily_schedules']??''),
            'teacher'=>$student?($row['teacher']??''):($actor['full_name']??''),'teachers'=>$teachers,'subject'=>$matches[0],'subjects'=>$matches,'assignedSubjects'=>$matches,
            'students'=>$student?array_values(array_filter(gradeList($row['students']??''),fn($entry)=>gradeMatches($entry,$actor))):gradeList($row['students']??''),'studentsCount'=>(int)($row['students_count']??0),
            'status'=>$row['status'],'isDeleted'=>false,'createdAt'=>$row['created_at'],'updatedAt'=>$row['updated_at']
        ];
    }
    $records=[];
    foreach($assigned as $row)$records[]=[
        'id'=>$row['id'],'code'=>$row['code'],'name'=>$row['name'],'gradeLevel'=>$row['grade_level'],
        'units'=>$row['units'],'learningHours'=>isset($row['learning_hours'])?(int)$row['learning_hours']:null,
        'type'=>$row['type'],'strand'=>$row['strand']??'','status'=>$row['status'],
        'curriculum'=>gradeList($row['curriculum_metadata']??''),'weights'=>gradeList($row['weights']??''),
        'activeQuarters'=>gradeList($row['active_quarters']??''),'topics'=>gradeList($row['topics']??''),'materials'=>gradeList($row['materials']??''),
        'isDeleted'=>false,'createdAt'=>$row['created_at'],'updatedAt'=>$row['updated_at']
    ];
    if($student)foreach($records as &$record){
        $allowed=$permitted[$record['id']]??[];
        $record['topics']=sigmaStudentClassContent($record['topics'],$allowed);
        $record['materials']=sigmaStudentClassContent($record['materials'],$allowed);
    }
    unset($record);
    $schoolYears=[];
    foreach($db->query('SELECT * FROM school_years WHERE is_deleted=0 ORDER BY year_start DESC')->fetchAll(PDO::FETCH_ASSOC) as $year){
        $record=['id'=>(string)$year['id'],'yearStart'=>(int)$year['year_start'],'yearEnd'=>(int)$year['year_end'],'status'=>$year['status'],'isDeleted'=>false];
        for($quarter=1;$quarter<=4;$quarter++)foreach(['Start'=>'start','End'=>'end'] as $key=>$column)$record['q'.$quarter.$key]=$year['q'.$quarter.'_'.$column]??'';
        $schoolYears[]=$record;
    }
    return ['success'=>true,'ownerId'=>(string)$actor['id'],'sections'=>$sections,'subjects'=>$records,'schoolYears'=>$schoolYears];
}

function sigmaTeacherClassrooms(PDO $db,array $actor): array {
    if(academicRole($actor)!=='teacher')throw new RuntimeException('Teacher access required.');
    return sigmaAssignedClassrooms($db,$actor);
}
// Return only released curriculum nodes; never ship answer keys in a class catalog.
function sigmaStudentClassContent(array $nodes,array $allowed): array {
    $result=[];
    foreach($nodes as $node){
        if(!is_array($node))continue;
        $id=(string)($node['id']??$node['materialId']??$node['assessmentId']??'');
        if(!isset($allowed[$id]))continue;
        foreach(['assignments','quiz','quizzes','activity','activities','performance','performanceTasks','assessments','learning','materials','learningMaterials','handouts','tasks','allMaterials'] as $key)
            if(isset($node[$key])&&is_array($node[$key]))$node[$key]=sigmaStudentClassContent($node[$key],$allowed);
        $result[]=sigmaClassWithoutAnswers($node);
    }
    return $result;
}
function sigmaClassWithoutAnswers(array $node): array {
    foreach($node as $key=>$value){
        if(in_array(strtolower((string)$key),['answer','answers','answerindex','correct','iscorrect','correctanswer','correctindex','explanation','acceptedanswers','itemalternatives','target'],true)){unset($node[$key]);continue;}
        if(is_array($value))$node[$key]=sigmaClassWithoutAnswers($value);
    }
    return $node;
}
