<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
require_once __DIR__.'/../includes/ai_request_auth.php';
require_once __DIR__.'/../includes/academic_evidence.php';
require_once __DIR__.'/../includes/assessment_records.php';
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
    if($method==='GET'&&($input['action']??'')==='sync'){
        echo json_encode(assessmentSnapshot($db,$actor),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;
    }
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
            if($data){
                if($recordType==='submission'&&!$staff){
                    $config=academicRead($db,'release',$subject,$section,'','assessments')??[];
                    $data=assessmentPublicRecord($data,!empty($config['assessmentShowCorrectAnswers'][$item['id']]));
                }
                $result[$recordType]=$data;
            }
        }
        echo json_encode(['success'=>true,'records'=>$result]);exit;
    }
    $db->beginTransaction();
    if($type==='release'){
        if(!$staff||!sigmaActorPermission($actor,$role==='teacher'?'teacherMaterials':'subjectPublish'))throw new RuntimeException('You cannot release this learning content.');
        $category=$input['category']??'';if(!in_array($category,['topics','learning','assessments'],true))throw new InvalidArgumentException('Invalid release category.');
        $config=$input['config']??[];
        $allowed=['publishAll','releasedTopicIds','releasedMaterialIds','hiddenTopicIds','hiddenMaterialIds','topicSchedules','materialSchedules','topicEndSchedules','materialEndSchedules','topicReleaseDates','materialReleaseDates','assignedStudents','assessmentMaxScores','assessmentRubricUrls','assessmentRubrics','assessmentCriteriaAiAuto','assessmentSelectedCriteria','assessmentAiAssisted','assessmentShowCorrectAnswers','assessmentLatePermissions','assessmentGradingModes','assessmentEssayGradingModes','assessmentManualReviewTypes','assessmentEndSchedules'];
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
    }elseif($type==='quiz_attempt'){
        $record=assessmentSubmitQuiz($db,$actor,$subject,$section,$input);
        $config=academicRead($db,'release',$subject,$section,'','assessments')??[];
        $record=assessmentPublicRecord($record,!empty($config['assessmentShowCorrectAnswers'][$record['materialId']]));
        $db->commit();echo json_encode(['success'=>true,'submission'=>$record],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;
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
            if(!empty($input['attemptIdentity'])&&($submission['attemptIdentity']??'')!==$input['attemptIdentity'])throw new RuntimeException('Open the latest submission before saving its review.');
            $review=[];
            foreach(['essayScores','enumItemScores','matchingItemScores','essayGraded'] as $field)if(is_array($input['review'][$field]??null)){
                foreach($input['review'][$field] as $key=>$value){
                    if(strlen((string)$key)>100||(!is_numeric($value)&&!is_bool($value)))throw new InvalidArgumentException('Invalid review score.');
                    $review[$field][(string)$key]=is_bool($value)?$value:max(0,min((float)$max,(float)$value));
                }
            }
            if(strlen(json_encode($review))>20000)throw new InvalidArgumentException('Review data is too large.');
            academicWrite($db,$actor,'score',$subject,$section,$student['id'],$item['id'],['score'=>$score===null?null:(float)$score,'maxScore'=>$max,'feedback'=>academicText($input['feedback']??(academicRead($db,'score',$subject,$section,$student['id'],$item['id'])['feedback']??''),5000),'attemptIdentity'=>$submission['attemptIdentity']??'']+$review);
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
            if(!sigmaActorPermission($actor,'studentGrades')||strtolower($section['status']??'')!=='deployed'||strtolower($subject['status']??'')!=='published')throw new RuntimeException('This assessment is unavailable.');
            if(!empty($item['data']['selectedQuizId'])||!empty($item['data']['quizId'])||strtolower($item['data']['type']??$item['data']['category']??'')==='quiz')throw new RuntimeException('Submit this quiz through its quiz player.');
            $release=academicRelease($db,$subject,$section,$item,$actor['id']);
            if(!$release)throw new RuntimeException('This assessment is not released to you.');
            $config=academicRead($db,'release',$subject,$section,'','assessments')??[];
            if($release['dueAt']&&academicTime($release['dueAt'])<time()&&!($config['assessmentLatePermissions'][$item['id']]??$item['data']['latePermission']??true))throw new RuntimeException('This assessment is closed.');
            $text=trim(is_string($input['text']??null)?$input['text']:'');
            if(mb_strlen($text)>60000)throw new InvalidArgumentException('The complete submitted text exceeds the supported evaluation size.');
            $identity=academicText($input['attemptIdentity']??'',4000);
            if(!$identity)throw new InvalidArgumentException('Submission attempt is required.');
            $lock=$db->prepare('SELECT id FROM subjects WHERE id=? FOR UPDATE');$lock->execute([$subject['id']]);
            $previous=academicRead($db,'submission',$subject,$section,$actor['id'],$item['id']);
            $files=[];
            foreach($input['files']??[] as $file){
                $url=(string)($file['url']??'');
                if(!preg_match('~^(https://|/?uploads/)~i',$url)||strlen($url)>4000)throw new InvalidArgumentException('Upload the answer file before submitting it.');
                $files[]=['name'=>academicText($file['name']??$file['fileName']??'Answer file',200),'url'=>$url,'size'=>max(0,(int)($file['size']??0)),'type'=>academicText($file['type']??'',100)];
            }
            $sameAttempt=$previous&&($previous['attemptIdentity']??'')===$identity;
            $limit=max(1,min(10,(int)($item['data']['maxAttempts']??$item['data']['attempts']??1)));
            if($previous&&!$sameAttempt&&(int)($previous['attemptsUsed']??1)>=$limit)throw new RuntimeException('The maximum submission attempts have been reached.');
            academicWrite($db,$actor,'submission',$subject,$section,$actor['id'],$item['id'],['text'=>$text,'attemptIdentity'=>$identity,'submittedAt'=>$previous['submittedAt']??gmdate('c'),'readable'=>(bool)$text,
                'studentId'=>(string)$actor['id'],'studentName'=>$actor['full_name']??'','subjectId'=>$subject['id'],'section'=>$section['name'],
                'materialId'=>$item['id'],'assessmentId'=>$item['id'],'title'=>$item['data']['title']??'Assessment','topicIdx'=>$item['topicIdx'],'topicItemIdx'=>$item['itemIdx'],'tab'=>'assessments','quarter'=>$item['data']['quarter']??'',
                'files'=>$files,'comment'=>academicText($input['comment']??'',5000),'status'=>'Submitted','attemptsUsed'=>$sameAttempt?(int)($previous['attemptsUsed']??1):((int)($previous['attemptsUsed']??0)+1)]);
        }
    }else throw new InvalidArgumentException('Unsupported academic record.');
    $db->commit();
    echo json_encode(['success'=>true]);
}catch(Throwable $error){if(isset($db)&&$db->inTransaction())$db->rollBack();http_response_code($error instanceof InvalidArgumentException?400:409);echo json_encode(['success'=>false,'error'=>$error->getMessage()]);}
