<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
require_once __DIR__.'/../includes/ai_request_auth.php';
require_once __DIR__.'/../includes/academic_evidence.php';
require_once __DIR__.'/../includes/assessment_records.php';
require_once __DIR__.'/../includes/submission_uploads.php';
require_once __DIR__.'/../includes/submission_ai_queue.php';
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
        $onlyScope=null;
        if(trim((string)($input['subjectId']??''))!==''&&trim((string)($input['section']??''))!==''){
            [$scopeSubject,$scopeSection]=academicScope($db,$actor,(string)$input['subjectId'],(string)$input['section']);
            $onlyScope=['subject'=>$scopeSubject,'section'=>$scopeSection];
        }
        echo json_encode(assessmentSnapshot($db,$actor,$onlyScope),JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;
    }
    if($method==='GET'&&($input['action']??'')==='submission_ai_results'){
        require_once __DIR__.'/../includes/submission_ai_records.php';
        echo json_encode(['success'=>true,'records'=>sigmaSubmissionAiRecords($db,$actor)],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;
    }
    $targetSections=[];
    if($method==='POST'&&$type==='release'&&in_array(strtolower((string)($input['section']??'')),['','all'],true)){
        $subject=academicSubject($db,(string)($input['subjectId']??''));
        foreach($db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll() as $candidate)if(academicSectionSubjects($candidate,$subject)&&(academicAdmin($actor)||($role==='teacher'&&academicTeacher($candidate,$actor,$subject))))$targetSections[]=$candidate;
        if(!$targetSections)throw new InvalidArgumentException('Assign this live subject to a section before releasing its content.');
        foreach($input['config']['assignedStudents']??[] as $audience){
            if(!is_array($audience))throw new InvalidArgumentException('Choose students from the current section roster.');
            if($audience && !academicReleaseIsAllStudents($audience))throw new InvalidArgumentException('Choose a specific section for selected-student releases.');
        }
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
                $rubric=$recordType==='evaluation'?academicRead($db,'rubric',$subject,$section,'',$item['id']):null;
                if(($data['attemptIdentity']??'')!==($submission['attemptIdentity']??''))continue;
                if($recordType==='evaluation'&&(($data['rubricFingerprint']??'')!==hash('sha256',json_encode($rubric))||($data['curriculumFingerprint']??'')!==hash('sha256',json_encode($item))))continue;
                if($recordType==='feedback'){
                    $legacy=empty($data['feedbackPolicy']);
                    if(!sigmaSubmissionFeedbackRecordIsCurrent($data,$submission,
                        $legacy?academicRead($db,'score',$subject,$section,$student['id'],$item['id']):null,
                        $legacy?academicRead($db,'rubric',$subject,$section,'',$item['id']):null,$item,
                        $legacy?academicRead($db,'teacher_feedback',$subject,$section,$student['id'],$item['id']):null))continue;
                }
            }
            if($data){
                if($recordType==='submission'&&!$staff){
                    $config=academicRead($db,'release',$subject,$section,'','assessments')??[];
                    $data=assessmentPublicRecord($data,assessmentShowCorrectAnswers($config,$item));
                }
                $result[$recordType]=$data;
            }
        }
        // Missing copies carry durable progress, so the UI can distinguish a
        // running job from an exhausted failure without generating on a read.
        require_once __DIR__.'/../includes/ai_background_limits.php';
        $jobs=[];$submission=$result['submission']??null;
        if($submission){
            $retryAt=sigmaBackgroundAiRetryAt($db);
            foreach($staff?['evaluation','feedback']:['feedback'] as $mode){
                if(isset($result[$mode]))continue;
                $rubric=$mode==='evaluation'?academicRead($db,'rubric',$subject,$section,'',$item['id']):null;
                $version=sigmaSubmissionAiVersion((string)$submission['attemptIdentity'],$mode,$item,$rubric);
                $job=academicRead($db,'submission_ai_job',$subject,$section,$student['id'],$item['id'].':'.$mode.':'.$version);
                if(!$job)continue;
                $waiting=in_array($job['state']??'',['pending','processing'],true)||(($job['state']??'')==='failed'&&($job['attempts']??0)<3);
                $jobs[$mode]=['state'=>$job['state'],'pending'=>$waiting,'retryAfter'=>max($retryAt,(int)($job['retryAfter']??0)),
                    'error'=>$waiting?'':($job['error']??'AI preparation did not complete. Please try again.')];
            }
        }
        echo json_encode(['success'=>true,'records'=>$result,'jobs'=>$jobs]);exit;
    }
    $queuedSubmissionUploads=0;$confirmedReleases=[];$changedReleaseItems=[];
    if(in_array($type,['score','gradebook_import','submission','quiz_attempt','release'],true))sigmaEnsureSectionNotificationSchema($db);
    $db->beginTransaction();
    if($type==='gradebook_import'){
        require_once __DIR__.'/../includes/gradebook_import.php';
        sigmaImportGradebookScores($db,$actor,$subject,$section,$input);
    }elseif($type==='release'){
        if(!$staff||!sigmaActorPermission($actor,$role==='teacher'?'teacherMaterials':'subjectPublish'))throw new RuntimeException('You cannot release this learning content.');
        $category=$input['category']??'';if(!in_array($category,['topics','learning','assessments'],true))throw new InvalidArgumentException('Invalid release category.');
        $config=$input['config']??[];
        $allowed=['publishAll','releasedTopicIds','releasedMaterialIds','hiddenTopicIds','hiddenMaterialIds','topicSchedules','materialSchedules','topicEndSchedules','materialEndSchedules','topicReleaseDates','materialReleaseDates','assignedStudents','assessmentWeights','assessmentActivityComponents','assessmentComponents','assessmentHasTimers','assessmentTimeLimits','assessmentTimeLimitMinutes','assessmentAutoSubmitOnExit','assessmentAllowFileUploads','defaultMaxScore','defaultWeight','defaultActivityComponent','defaultLatePermission','defaultGradingMode','assessmentMaxAttempts','defaultMaxAttempts','assessmentMaxScores','assessmentRubricUrls','assessmentRubrics','assessmentCriteriaAiAuto','assessmentSelectedCriteria','assessmentAiAssisted','assessmentShowCorrectAnswers','assessmentLatePermissions','assessmentGradingModes','assessmentEssayGradingModes','assessmentManualReviewTypes','assessmentEndSchedules'];
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
            // Stable item IDs take precedence over legacy title aliases.
            foreach($value as $alias=>$setting)if(isset($aliases[(string)$alias])&&$aliases[(string)$alias]===(string)$alias)$mapped[(string)$alias]=$setting;
            $config[$field]=$mapped;
        }
        // All-student schedules do not need to load the entire account directory.
        $needsRoster=false;
        foreach($config['assignedStudents']??[] as $ids){
            if(!is_array($ids))throw new InvalidArgumentException('Choose students from the current section roster.');
            if($ids && !academicReleaseIsAllStudents($ids))$needsRoster=true;
        }
        $roster=$needsRoster?array_values(array_filter($db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student'")->fetchAll(),fn($user)=>gradeStudent($section,$user))):[];
        foreach($config['assignedStudents']??[] as $itemId=>$ids){
            if(!is_array($ids))throw new InvalidArgumentException('Choose students from the current section roster.');
            $config['assignedStudents'][$itemId]=academicReleaseStudentIds($ids,$roster);
        }
        foreach($targetSections?:[$section] as $releaseSection){
            $previous=academicRead($db,'release',$subject,$releaseSection,'',$category)??[];
            academicWrite($db,$actor,'release',$subject,$releaseSection,'',$category,$config);
            $confirmedReleases[]=['subjectId'=>$subject['id'],'sectionId'=>$releaseSection['id'],'section'=>$releaseSection['name'],
                'category'=>$category,'config'=>academicRead($db,'release',$subject,$releaseSection,'',$category)];
            if($category==='assessments')$changedReleaseItems[$releaseSection['id']]=sigmaSubmissionAiChangedReleaseItems($db,$subject,$releaseSection,$catalog,$previous,$config);
        }
    }elseif($type==='attempt_permission'){
        if(!$staff||!sigmaActorPermission($actor,'teacherGrades'))throw new RuntimeException('Only an assigned grading teacher can grant another attempt.');
        $item=academicItem($subject,$input);$student=academicStudent($db,$section,(string)($input['studentId']??''));
        $lock=$db->prepare('SELECT id FROM subjects WHERE id=? FOR UPDATE');$lock->execute([$subject['id']]);
        $previous=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
        if(!$previous)throw new RuntimeException('There is no submitted attempt for this student.');
        $previous['extraAttempts']=!empty($input['revoke'])?0:min(10,(int)($previous['extraAttempts']??0)+1);
        $previous['allowResubmitGranted']=$previous['extraAttempts']>0;
        unset($previous['recordedAt']);
        academicWrite($db,$actor,'submission',$subject,$section,$student['id'],$item['id'],$previous);
    }elseif($type==='quiz_attempt'){
        for($quizSaveAttempt=0;$quizSaveAttempt<3;$quizSaveAttempt++){
            if($quizSaveAttempt>0)$db->beginTransaction();
            try{
                $record=assessmentSubmitQuiz($db,$actor,$subject,$section,$input);
                $config=academicRead($db,'release',$subject,$section,'','assessments')??[];
                $record=assessmentPublicRecord($record,assessmentShowCorrectAnswers($config,['id'=>$record['materialId'],'data'=>$record]));
                $db->commit();echo json_encode(['success'=>true,'submission'=>$record],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;
            }catch(PDOException $error){
                if($db->inTransaction())$db->rollBack();
                $sqlState=(string)$error->getCode();$driverCode=(int)($error->errorInfo[1]??0);
                $message=strtolower($error->getMessage());
                $retryable=($sqlState==='40001'||in_array($driverCode,[1020,1205,1213],true)
                    ||str_contains($message,'try restarting transaction'));
                if(!$retryable||$quizSaveAttempt===2)throw $error;
                usleep(50000*(2**$quizSaveAttempt));
            }
        }
        throw new RuntimeException('The quiz could not be saved after retrying a temporary database conflict. Please submit again.');
    }elseif($type==='attendance'){
        require_once __DIR__.'/../includes/attendance_records.php';
        attendanceSubmit($db,$actor,$input);
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
            $max=academicMaximum($item);
            $calculatedQuiz=academicIsDigitalQuiz($item);
            $score=assessmentScoreValue($input['score']??null,$max,$calculatedQuiz);
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
            $previousGrade=academicRead($db,'score',$subject,$section,$student['id'],$item['id']);
            $gradingStatus=sigmaGradingStatus($input['gradingStatus']??$previousGrade['gradingStatus']??'none');
            $statusLabel=$gradingStatus==='none'?($score===null?'Submitted':'Graded'):ucfirst($gradingStatus);
            academicWrite($db,$actor,'score',$subject,$section,$student['id'],$item['id'],['score'=>$score===null?null:(float)$score,'maxScore'=>$max,'gradingStatus'=>$gradingStatus,'attendance'=>$gradingStatus==='none'?'':$gradingStatus,'status'=>$statusLabel,'feedback'=>academicText($input['feedback']??(academicRead($db,'score',$subject,$section,$student['id'],$item['id'])['feedback']??''),5000),'attemptIdentity'=>$submission['attemptIdentity']??'']+$review);
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
            if(academicIsDigitalQuiz($item))throw new RuntimeException('Submit this quiz through its quiz player.');
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
            $limit=assessmentSubmissionLimit($item,$config)+max(0,(int)($previous['extraAttempts']??0));
            if($previous&&!$sameAttempt&&(int)($previous['attemptsUsed']??1)>=$limit)throw new RuntimeException('The maximum submission attempts have been reached.');
            academicWrite($db,$actor,'submission',$subject,$section,$actor['id'],$item['id'],['text'=>$text,'attemptIdentity'=>$identity,'submittedAt'=>$sameAttempt?$previous['submittedAt']:gmdate('c'),'readable'=>(bool)$text,
                'studentId'=>(string)$actor['id'],'studentName'=>$actor['full_name']??'','subjectId'=>$subject['id'],'section'=>$section['name'],
                'materialId'=>$item['id'],'assessmentId'=>$item['id'],'title'=>$item['data']['title']??'Assessment','topicIdx'=>$item['topicIdx'],'topicItemIdx'=>$item['itemIdx'],'tab'=>'assessments','quarter'=>$item['data']['quarter']??'',
                'extraAttempts'=>(int)($previous['extraAttempts']??0),'allowResubmitGranted'=>!empty($previous['allowResubmitGranted']),'history'=>assessmentSubmissionHistory($previous,$identity,$files,$text,$sameAttempt),'files'=>$files,'comment'=>academicText($input['comment']??'',5000),'status'=>'Submitted','attemptsUsed'=>$sameAttempt?(int)($previous['attemptsUsed']??1):((int)($previous['attemptsUsed']??0)+1)]);
            $queuedSubmissionUploads=sigmaQueueSubmittedUploads($db,$actor,$files,(string)$subject['id'],(string)($item['data']['title']??'Assessment'));
        }
    }else throw new InvalidArgumentException('Unsupported academic record.');
    if($type==='submission'||$type==='score'||$type==='teacher_feedback'){
        sigmaQueueSubmissionAnalysis($db,$actor,$subject,$section,(string)$student['id'],(string)$item['id'],'evaluation');
        sigmaQueueSubmissionAnalysis($db,$actor,$subject,$section,(string)$student['id'],(string)$item['id'],'feedback',null,false,false,$type==='score');
    }elseif($type==='release'&&$category==='assessments'){
        foreach($targetSections?:[$section] as $releaseSection){
            $affected=$changedReleaseItems[$releaseSection['id']]??[];
            if(!$affected)continue;
            $placeholders=implode(',',array_fill(0,count($affected),'?'));
            $q=$db->prepare("SELECT student_id,item_id FROM academic_records WHERE record_type='submission' AND subject_id=? AND section_id=? AND item_id IN ($placeholders)");
            $q->execute(array_merge([$subject['id'],$releaseSection['id']],array_keys($affected)));
            foreach($q->fetchAll(PDO::FETCH_ASSOC) as $savedSubmission){
                $itemId=(string)$savedSubmission['item_id'];
                foreach(['evaluation','feedback'] as $analysisMode)sigmaQueueSubmissionAnalysis($db,$actor,$subject,$releaseSection,(string)$savedSubmission['student_id'],$itemId,$analysisMode,$affected[$itemId]);
            }
        }
    }
    $confirmedSubmission=$type==='submission'?academicRead($db,'submission',$subject,$section,(string)$actor['id'],$item['id']):null;
    $db->commit();
    if($queuedSubmissionUploads>0)sigmaStartSubmissionUploadSync();
    sigmaStartSubmissionAnalysis();
    require_once __DIR__.'/../includes/grade_insight_jobs.php';
    sigmaStartGradeInsightJobs();
    echo json_encode(['success'=>true]+($type==='release'?['releases'=>$confirmedReleases]:[])+($confirmedSubmission?['submission'=>$confirmedSubmission]:[]));
}catch(Throwable $error){if(isset($db)&&$db->inTransaction())$db->rollBack();http_response_code($error instanceof InvalidArgumentException?400:409);echo json_encode(['success'=>false,'error'=>$error->getMessage()]);}
