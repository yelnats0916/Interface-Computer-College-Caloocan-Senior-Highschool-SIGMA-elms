<?php
require_once __DIR__.'/academic_evidence.php';
require_once __DIR__.'/school_year_policy.php';

function sigmaAssignedClassrooms(PDO $db, array $actor): array {
    sigmaEnsureActiveSemesterColumn($db);
    $student=academicRole($actor)==='student';
    if (!$student && academicRole($actor)!=='teacher') throw new RuntimeException('Classroom access required.');
    $subjects=$db->query("SELECT * FROM subjects WHERE is_deleted=0 AND LOWER(status)='published'")->fetchAll(PDO::FETCH_ASSOC);
    $sections=[];$assigned=[];$permitted=[];
    foreach($db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status) IN ('deployed','published','active') ORDER BY created_at DESC,id DESC")->fetchAll(PDO::FETCH_ASSOC) as $row){
        $matches=[];
        foreach($subjects as $subject){
            if(academicSectionSubjects($row,$subject)&&($student?gradeStudent($row,$actor):academicTeacher($row,$actor,$subject))){
                $matches[]=$subject['name'];$assigned[$subject['id']]=$subject;
                if($student){
                    // Read each release configuration once per class, not once per curriculum item.
                    $configs=[];foreach(['topics','learning','assessments'] as $category)$configs[$category]=academicRead($db,'release',$subject,$row,'',$category)??[];
                    foreach(academicItems($subject) as $item){
                        $category=['assessment'=>'assessments','topic'=>'topics','learning'=>'learning'][$item['kind']];
                        if(academicReleaseFromConfig($configs[$category],$item,(string)$actor['id']))$permitted[$subject['id']][$item['id']]=true;
                    }
                }
            }
        }
        if(!$matches)continue;
        $teachers=array_values(array_filter(gradeList($row['teachers']??''),fn($teacher)=>$student||gradeMatches($teacher,$actor)));
        $sections[]=[
            'id'=>(string)$row['id'],'name'=>$row['name'],'grade'=>$row['grade_level'],'gradeLevel'=>$row['grade_level'],
            'room'=>$row['room'],'schoolYear'=>$row['school_year'],'startTime'=>$row['start_time'],'endTime'=>$row['end_time'],
            'days'=>array_values(array_filter(array_map('trim',explode(',',$row['days']??'')))),'daysFormatted'=>$row['days']??'',
            'schedule'=>$row['schedule'],'dailySchedules'=>gradeList($row['daily_schedules']??''),
            'adviser'=>$row['adviser']??'','adviserId'=>$row['adviser_id']??'','teacher'=>$student?($row['teacher']??''):($actor['full_name']??''),'teachers'=>$teachers,'subject'=>$matches[0],'subjects'=>$matches,'assignedSubjects'=>$matches,
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
    // Load the attached published quiz once and share its metadata with both portals.
    $quizFiles=[];
    $quizIds=[];array_walk_recursive($records,function($value,$key)use(&$quizIds){if(in_array($key,['selectedQuizId','quizId'],true)&&is_scalar($value)&&trim((string)$value)!=='')$quizIds[(string)$value]=true;});
    if($quizIds){$query=$db->prepare("SELECT id,title,questions,total_points,icon,color,is_ai,time_limit FROM quizzes WHERE is_deleted=0 AND LOWER(status)='published' AND id IN (".implode(',',array_fill(0,count($quizIds),'?')).")");$query->execute(array_keys($quizIds));foreach($query->fetchAll(PDO::FETCH_ASSOC) as $quiz)$quizFiles[(string)$quiz['id']]=$quiz;}
    foreach($records as &$record){$record['topics']=sigmaClassAttachQuizzes($record['topics'],$quizFiles);$record['materials']=sigmaClassAttachQuizzes($record['materials'],$quizFiles);}
    unset($record);
    if($student)foreach($records as &$record){
        $allowed=$permitted[$record['id']]??[];
        $record['topics']=sigmaStudentClassContent($record['topics'],$allowed);
        $record['materials']=sigmaStudentClassContent($record['materials'],$allowed);
    }
    unset($record);
    $schoolYears=[];
    foreach($db->query('SELECT * FROM school_years WHERE is_deleted=0 ORDER BY year_start DESC')->fetchAll(PDO::FETCH_ASSOC) as $year){
        $record=['id'=>(string)$year['id'],'yearStart'=>(int)$year['year_start'],'yearEnd'=>(int)$year['year_end'],'status'=>$year['status'],'activeSemester'=>(int)($year['active_semester']??1)===2?2:1,'isDeleted'=>false];
        for($quarter=1;$quarter<=4;$quarter++)foreach(['Start'=>'start','End'=>'end'] as $key=>$column)$record['q'.$quarter.$key]=$year['q'.$quarter.'_'.$column]??'';
        $schoolYears[]=$record;
    }
    $advisorySections=[];
    if(!$student){
        $all=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status) IN ('deployed','published','active')")->fetchAll(PDO::FETCH_ASSOC);
        $advised=array_values(array_filter($all,fn($row)=>gradeAdviser($row,$actor)));
        foreach($all as $row)foreach($advised as $advice)if($row['name']===$advice['name']&&$row['school_year']===$advice['school_year']){
            // Advisory catalogs must use the same published subject boundary as assigned classes.
            $visibleSubjects=array_values(array_filter($subjects,fn($subject)=>academicSectionSubjects($row,$subject)));
            if(!$visibleSubjects)break;
            $names=array_column($visibleSubjects,'name');
            $row['subject']=$names[0];
            $row['subjects']=json_encode($names);
            $advisorySections[]=['id'=>$row['id'],'name'=>$row['name'],'gradeLevel'=>$row['grade_level'],'schoolYear'=>$row['school_year'],'status'=>$row['status'],
                'subject'=>$row['subject'],'subjects'=>gradeList($row['subjects']??''),'teachers'=>gradeList($row['teachers']??''),'students'=>gradeList($row['students']??''),
                'adviser'=>$advice['adviser'],'adviserId'=>$advice['adviser_id']];break;
        }
    }
    return ['success'=>true,'ownerId'=>(string)$actor['id'],'sections'=>$sections,'advisorySections'=>$advisorySections,'subjects'=>$records,'schoolYears'=>$schoolYears];
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
        foreach(['assignments','quiz','quizzes','activity','activities','performance','performanceTasks','assessments','learning','materials','learningMaterials','handouts','videos','lessons','tasks','allMaterials'] as $key)
            if(isset($node[$key])&&is_array($node[$key]))$node[$key]=sigmaStudentClassContent($node[$key],$allowed);
        $result[]=sigmaClassWithoutAnswers($node);
    }
    return $result;
}
function sigmaClassWithoutAnswers(array $node): array {
    $type=strtolower((string)($node['type']??''));
    if(str_contains($type,'matching')&&is_array($node['pairs']??null)){
        $choices=array_values(array_filter(array_map(fn($pair)=>$pair['target']??'', $node['pairs'])));sort($choices,SORT_NATURAL|SORT_FLAG_CASE);$node['matchingChoices']=$choices;
    }
    if(str_contains($type,'enumeration')&&is_array($node['items']??null))$node['items']=array_fill(0,count($node['items']),'');
    foreach($node as $key=>$value){
        if(in_array(strtolower((string)$key),['answer','answers','answerindex','correct','iscorrect','correctanswer','correctindex','explanation','acceptedanswers','acceptableanswers','sampleanswer','alternatives','alternateanswers','itemalternatives','target'],true)){unset($node[$key]);continue;}
        if(is_array($value))$node[$key]=sigmaClassWithoutAnswers($value);
    }
    return $node;
}

// Quiz questions stay attached to their released assessment; students never receive the library or answer keys.
function sigmaClassAttachQuizzes(array $nodes,array $quizzes): array {
    foreach($nodes as &$node){
        if(!is_array($node))continue;
        $id=(string)($node['selectedQuizId']??$node['quizId']??'');
        if($id!==''&&isset($quizzes[$id])){
            $quiz=$quizzes[$id];$questions=gradeList($quiz['questions']??'');
            $node['questions']=$questions;$node['questionsCount']=count($questions);
            $node['selectedQuizQuestions']=count($questions);$node['selectedQuizPoints']=(int)$quiz['total_points'];
            $node['selectedQuizIcon']=$quiz['icon'];$node['selectedQuizColor']=$quiz['color'];
            $node['quizObj']=['id'=>$id,'title'=>$quiz['title'],'questions'=>$questions,'questionsCount'=>count($questions),'totalPoints'=>(int)$quiz['total_points'],'icon'=>$quiz['icon'],'color'=>$quiz['color'],'isAI'=>(bool)$quiz['is_ai'],'timeLimit'=>$quiz['time_limit']];
        }
        foreach(['assignments','quiz','quizzes','activity','activities','performance','performanceTasks','assessments','learning','materials','learningMaterials','handouts','videos','lessons','tasks','allMaterials'] as $key)
            if(isset($node[$key])&&is_array($node[$key]))$node[$key]=sigmaClassAttachQuizzes($node[$key],$quizzes);
    }unset($node);return $nodes;
}
