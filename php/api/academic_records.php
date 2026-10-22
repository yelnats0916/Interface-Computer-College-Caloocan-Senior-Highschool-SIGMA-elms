<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
require_once __DIR__.'/../includes/ai_request_auth.php';
require_once __DIR__.'/../includes/academic_evidence.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS')exit;
$actor=sigmaRequireAiActor(['student','teacher','admin','masteradmin','administrator']);
try{
    $db=serviceSettingsPdo();$method=$_SERVER['REQUEST_METHOD']??'';
    if(!in_array($method,['GET','POST'],true))throw new InvalidArgumentException('Unsupported request method.');
    $raw=$method==='POST'?file_get_contents('php://input',false,null,0,180001):'';
    if(strlen($raw)>180000)throw new InvalidArgumentException('Academic record is too large.');
    $input=$method==='POST'?json_decode($raw,true,64,JSON_THROW_ON_ERROR):$_GET;
    sigmaRequireRealRecords($input);$type=$input['type']??'';$role=academicRole($actor);
    $targetSections=[];
    if($method==='POST'&&$type==='release'&&in_array(strtolower((string)($input['section']??'')),['','all'],true)){
        $subject=academicSubject($db,(string)($input['subjectId']??''));
        foreach($db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll() as $candidate)if(academicSectionSubjects($candidate,$subject)&&(academicAdmin($actor)||($role==='teacher'&&academicTeacher($candidate,$actor,$subject))))$targetSections[]=$candidate;
        if(!$targetSections)throw new InvalidArgumentException('Assign this live subject to a section before releasing its content.');
        if(array_filter($input['config']['assignedStudents']??[]))throw new InvalidArgumentException('Choose a specific section for selected-student releases.');
        $section=$targetSections[0];
    }else [$subject,$section]=academicScope($db,$actor,(string)($input['subjectId']??''),(string)($input['section']??''));

    $staff=$role==='teacher'||academicAdmin($actor);
    if($method==='GET'){
        if(!sigmaActorPermission($actor,$role==='student'?'studentGrades':'teacherGrades'))throw new RuntimeException('Learning feedback access is disabled.');
        $student=$role==='student'?$actor:academicStudent($db,$section,(string)($input['studentId']??''));
        $item=academicResolvedItem($db,$subject,$section,academicItem($subject,$input));
        $result=[];foreach(['submission','score','evaluation','feedback'] as $recordType){
            $data=academicRead($db,$recordType,$subject,$section,$student['id'],$item['id']);
            // Private teacher-only suggestions are not official student feedback.
            if($recordType==='evaluation'&&!$staff)continue;
            if($data && in_array($recordType,['evaluation','feedback'],true)){
                $submission=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
                $rubric=academicRead($db,'rubric',$subject,$section,'',$item['id']);
                if(($data['attemptIdentity']??'')!==($submission['attemptIdentity']??'')||($data['rubricFingerprint']??'')!==hash('sha256',json_encode($rubric))||($data['curriculumFingerprint']??'')!==hash('sha256',json_encode($item)))continue;
                if($recordType==='feedback'&&($data['teacherNoteFingerprint']??'')!==hash('sha256',json_encode(academicRead($db,'teacher_feedback',$subject,$section,$student['id'],$item['id']))))continue;
                if($recordType==='feedback'&&($data['gradeFingerprint']??'')!==hash('sha256',json_encode(academicRead($db,'score',$subject,$section,$student['id'],$item['id']))))continue;
            }
            if($data)$result[$recordType]=$data;
        }
        echo json_encode(['success'=>true,'records'=>$result]);exit;
    }
    $db->beginTransaction();
    if($type==='release'){
        if(!$staff||!sigmaActorPermission($actor,$role==='teacher'?'teacherMaterials':'subjectPublish'))throw new RuntimeException('You cannot release this learning content.');
        $category=$input['category']??'';if(!in_array($category,['topics','learning','assessments'],true))throw new InvalidArgumentException('Invalid release category.');
        $config=$input['config']??[];
        $allowed=['publishAll','releasedTopicIds','releasedMaterialIds','hiddenTopicIds','hiddenMaterialIds','topicSchedules','materialSchedules','topicEndSchedules','materialEndSchedules','topicReleaseDates','materialReleaseDates','assignedStudents','assessmentMaxScores','assessmentRubricUrls','assessmentRubrics','assessmentCriteriaAiAuto','assessmentSelectedCriteria','assessmentAiAssisted'];
        $config=array_intersect_key($config,array_flip($allowed));
        if(strlen(json_encode($config))>90000)throw new InvalidArgumentException('Release configuration is too large.');
        $catalog=academicItems($subject);$expected=['topics'=>'topic','learning'=>'learning','assessments'=>'assessment'][$category];
        $aliases=[];foreach($catalog as $entry)if($entry['kind']===$expected){$aliases[$entry['id']]=$entry['id'];foreach(['title','name','origId','materialId','assessmentId'] as $field)if(!empty($entry['data'][$field]))$aliases[(string)$entry['data'][$field]]=$entry['id'];}
        foreach(['releasedTopicIds','releasedMaterialIds','hiddenTopicIds','hiddenMaterialIds'] as $field)if(isset($config[$field])){
            $original=$config[$field];$config[$field]=array_values(array_unique(array_values(array_intersect_key($aliases,array_flip(array_map('strval',$original))))));
            if($original&&!$config[$field]&&str_starts_with($field,'released'))throw new InvalidArgumentException('Release contains no saved curriculum items. Save the curriculum first.');
        }
        foreach($config as $field=>$value)if(!in_array($field,['publishAll','releasedTopicIds','releasedMaterialIds','hiddenTopicIds','hiddenMaterialIds'],true)&&is_array($value)){
            $mapped=[];foreach($value as $alias=>$setting)if(isset($aliases[(string)$alias]))$mapped[$aliases[(string)$alias]]=$setting;
            $config[$field]=$mapped;
        }
        foreach($config['assignedStudents']??[] as $ids)foreach($ids as $id)academicStudent($db,$section,(string)$id);
        foreach($targetSections?:[$section] as $releaseSection)academicWrite($db,$actor,'release',$subject,$releaseSection,'',$category,$config);
    }elseif($type==='attendance'){
        if(!$staff||!sigmaActorPermission($actor,'teacherAttendance'))throw new RuntimeException('Attendance access is disabled.');
        $date=$input['date']??'';if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$date)||!strtotime($date)||$date>academicDay())throw new InvalidArgumentException('Choose a valid attendance date.');
        $statuses=[];foreach($input['statuses']??[] as $id=>$status){
            $student=null;
            foreach($db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student'")->fetchAll() as $candidate)if(gradeStudent($section,$candidate)&&gradeMatches((string)$id,$candidate)){$student=$candidate;break;}
            if(!$student)throw new RuntimeException('An attendance entry is outside this section roster.');
            $status=strtolower((string)$status);$status=['p'=>'present','a'=>'absent','l'=>'late','e'=>'excused'][$status]??$status;
            if(!in_array($status,['present','absent','late','excused','excuse',''],true))throw new InvalidArgumentException('Invalid attendance status.');
            $statuses[$student['id']]=$status;
        }
        academicWrite($db,$actor,'attendance',$subject,$section,'',$date,['date'=>$date,'statuses'=>$statuses]);
    }elseif(in_array($type,['score','submission','rubric','teacher_feedback'],true)){
        $item=academicResolvedItem($db,$subject,$section,academicItem($subject,$input));$student=$type==='rubric'?null:academicStudent($db,$section,$role==='student'?$actor['id']:(string)($input['studentId']??''));
        if($type==='teacher_feedback'){
            if(!$staff||!sigmaActorPermission($actor,'teacherGrades'))throw new RuntimeException('Only an assigned grading teacher can provide learning feedback.');
            $submission=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
            if(!$submission||($input['attemptIdentity']??'')!==$submission['attemptIdentity'])throw new RuntimeException('Open the latest live submission before adding feedback.');
            $text=academicText($input['text']??'',5000);if(!$text&&empty($input['cleared']))throw new InvalidArgumentException('Teacher feedback is empty.');
            academicWrite($db,$actor,'teacher_feedback',$subject,$section,$student['id'],$item['id'],['text'=>$text,'attemptIdentity'=>$submission['attemptIdentity']]);
        }elseif($type==='score'){
            if(!$staff||!sigmaActorPermission($actor,'teacherGrades'))throw new RuntimeException('Only the assigned grading teacher can save a score.');
            $max=academicMaximum($item);$score=$input['score']??null;
            if($score==='')$score=null;
            if($score!==null && (!$max||!is_numeric($score)||$score<0||$score>$max))throw new InvalidArgumentException('Save the assessment maximum in the curriculum and enter a score within that maximum.');
            $submission=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
            academicWrite($db,$actor,'score',$subject,$section,$student['id'],$item['id'],['score'=>$score===null?null:(float)$score,'maxScore'=>$max,'feedback'=>academicText($input['feedback']??(academicRead($db,'score',$subject,$section,$student['id'],$item['id'])['feedback']??''),5000),'attemptIdentity'=>$submission['attemptIdentity']??'']);
        }elseif($type==='rubric'){
            if(!$staff||!sigmaActorPermission($actor,'teacherGrades'))throw new RuntimeException('Only the assigned teacher can provide a rubric.');
            $canonicalUrl=(string)($item['data']['rubricUrl']??$item['data']['rubricFileUrl']??'');
            $text=academicText($item['data']['rubricText']??'',60000);
            // Extraction of an uploaded PDF/DOCX is explicitly supplied by the assigned teacher, tied to its saved URL.
            if(!$text && $canonicalUrl && hash_equals($canonicalUrl,(string)($input['rubricUrl']??'')))$text=academicText($input['text']??'',60000);
            if(!$text)throw new InvalidArgumentException('Save the actual rubric text or uploaded rubric in this assessment first.');
            academicWrite($db,$actor,'rubric',$subject,$section,'',$item['id'],['text'=>$text,'sourceUrl'=>$canonicalUrl,'source'=>'assigned-teacher-rubric']);
        }else{
            if($role!=='student')throw new RuntimeException('Only the enrolled student can submit their own work.');
            if(!academicRelease($db,$subject,$section,$item,$actor['id']))throw new RuntimeException('This assessment is not released to you.');
            $text=academicText($input['text']??'',60000);$identity=academicText($input['attemptIdentity']??'',4000);
            if(!$identity)throw new InvalidArgumentException('Submission attempt is required.');
            $previous=academicRead($db,'submission',$subject,$section,$actor['id'],$item['id']);
            academicWrite($db,$actor,'submission',$subject,$section,$actor['id'],$item['id'],['text'=>$text,'attemptIdentity'=>$identity,'submittedAt'=>gmdate('c'),'readable'=>(bool)$text]);
        }
    }else throw new InvalidArgumentException('Unsupported academic record.');
    $db->commit();
    echo json_encode(['success'=>true]);
}catch(Throwable $error){if(isset($db)&&$db->inTransaction())$db->rollBack();http_response_code($error instanceof InvalidArgumentException?400:409);echo json_encode(['success'=>false,'error'=>$error->getMessage()]);}
