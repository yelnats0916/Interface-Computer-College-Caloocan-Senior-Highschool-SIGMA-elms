<?php
require_once __DIR__.'/academic_evidence.php';
require_once __DIR__.'/submission_feedback_records.php';

function assessmentScoreValue($value, ?float $maximum, bool $allowFractional = false): ?float {
    if($value===null||$value==='')return null;
    if(!$maximum||!is_numeric($value)||!is_finite((float)$value)||$value<0||$value>$maximum)throw new InvalidArgumentException('Save the assessment maximum in the curriculum and enter a score within that maximum.');
    if(!$allowFractional&&floor((float)$value)!=(float)$value)throw new InvalidArgumentException('The score must be a whole number between 0 and the assessment maximum.');
    return (float)$value;
}

function assessmentSubmissionLimit(array $item,array $config): int {
    $raw=$config['assessmentMaxAttempts'][$item['id']]??$item['data']['maxAttempts']??$item['data']['attempts']??$config['defaultMaxAttempts']??1;
    return max(1,min(10,(int)$raw));
}
function assessmentReleaseSetting(array $config,string $mapName,array $item,$default=null) {
    $map=$config[$mapName]??[];
    if(!is_array($map))return $default;
    $data=$item['data']??[];
    $keys=array_unique(array_filter([
        $item['id']??null,$data['materialId']??null,$data['id']??null,
        $data['title']??null,$data['name']??null,$data['selectedQuizId']??null,$data['quizId']??null
    ],fn($value)=>is_scalar($value)&&trim((string)$value)!==''));
    foreach($keys as $key)if(array_key_exists((string)$key,$map))return $map[(string)$key];
    $normalizedMap=[];
    foreach($map as $mapKey=>$value)if(is_scalar($mapKey))$normalizedMap[strtolower(trim((string)$mapKey))]=$value;
    foreach($keys as $key){$normalizedKey=strtolower(trim((string)$key));if(array_key_exists($normalizedKey,$normalizedMap))return $normalizedMap[$normalizedKey];}
    return $default;
}
function assessmentSubmissionHistory(?array $previous,string $identity,array $files,string $text,bool $sameAttempt): array {
    $history=$previous['history']??[];
    if(!$history&&$previous)$history=[array_intersect_key($previous,array_flip(['attemptIdentity','submittedAt','files','text','score','gradedAt','status','teacherSaved']))];
    if(!$sameAttempt)$history[]=['attemptIdentity'=>$identity,'submittedAt'=>gmdate('c'),'files'=>$files,'text'=>$text,'status'=>'Submitted'];
    foreach($history as $index=>&$attempt)$attempt['attemptNumber']=$index+1;
    return $history;
}

function assessmentQuestions(PDO $db, array $item): array {
    $data=$item['data'];
    $quizId=(string)($data['selectedQuizId']??$data['quizId']??'');
    if($quizId!==''){
        $q=$db->prepare("SELECT questions FROM quizzes WHERE id=? AND is_deleted=0 AND LOWER(status)='published'");
        $q->execute([$quizId]);$json=$q->fetchColumn();
        if($json===false)throw new RuntimeException('The assigned quiz is unavailable.');
        $questions=gradeList($json);
    }else $questions=gradeList($data['questions']??$data['quizQuestions']??[]);
    if(!$questions||count($questions)>100)throw new InvalidArgumentException('This assessment has no saved quiz questions.');
    return array_values($questions);
}

function assessmentGrade(array $questions, array $answers,array $settings=[]): array {
    $score=0.0;$maximum=0.0;$pending=false;
    $text=fn($v)=>is_scalar($v)?mb_strtolower(trim(preg_replace('/\s+/u',' ',(string)$v))):'';
    foreach($questions as $index=>$q){
        $points=max(0,(float)($q['points']??10));
        $type=strtolower(trim($q['type']??'Multiple Choice'));
        if(in_array($type,['enumeration','matching type'],true)&&isset($q['itemPoints'])){
            if(is_array($q['itemPoints']))$points=array_sum(array_map(fn($v)=>max(0,(float)$v),$q['itemPoints']));
            elseif(is_numeric($q['itemPoints']))$points=max(0,(float)$q['itemPoints'])*count($type==='enumeration'?($q['items']??[]):($q['pairs']??[]));
        }
        $maximum+=$points;
        $answer=$answers[$index]??$answers[(string)($q['id']??'')]??'';
        // Automatic essay scoring is opt-in. Missing or unfamiliar saved modes
        // must keep written responses pending teacher review.
        $mode=strtolower(trim((string)($settings['essayGradingMode']??'manual')));$mode=$mode==='auto'?'auto':'manual';$manual=$settings['manualReviewTypes']??[];
        if($mode!=='auto'&&(($type==='enumeration'&&!empty($manual['enumeration']))||(in_array($type,['short answer','identification'],true)&&!empty($manual['shortAnswer'])))){$pending=true;continue;}
        $expected=$q['correctAnswer']??$q['answer']??$q['correct']??null;
        $correct=false;
        if(in_array($type,['multiple choice','true/false','true or false','true false'],true)){
            $choices=$q['choices']??[];
            $choiceText=fn($v)=>is_array($v)?($v['text']??$v['label']??''):$v;
            $expectedIndex=$q['answerIndex']??$q['correctIndex']??null;
            if($expectedIndex===null&&$expected===null)foreach($choices as $i=>$choice)if(is_array($choice)&&(!empty($choice['isCorrect'])||!empty($choice['correct'])))$expectedIndex=$i;
            if($expectedIndex!==null&&isset($choices[(int)$expectedIndex]))$expected=$choiceText($choices[(int)$expectedIndex]);
            elseif(is_string($expected)&&preg_match('/^[A-Z]$/i',$expected)&&isset($choices[ord(strtoupper($expected))-65]))$expected=$choiceText($choices[ord(strtoupper($expected))-65]);
            if(is_string($answer)&&preg_match('/^[A-Z]$/i',$answer)&&isset($choices[ord(strtoupper($answer))-65]))$answer=$choiceText($choices[ord(strtoupper($answer))-65]);
            elseif(is_numeric($answer)&&isset($choices[(int)$answer]))$answer=$choiceText($choices[(int)$answer]);
            if($expected===null)$pending=true;
            else $correct=$text($answer)!==''&&$text($answer)===$text($expected);
        }elseif(in_array($type,['short answer','identification','fill in the blank','fill in the blanks'],true)){
            $accepted=$q['answers']??[$expected];if(!is_array($accepted))$accepted=[$accepted];
            $accepted=array_map(fn($v)=>is_array($v)?($v['text']??''):$v,$accepted);
            $accepted=array_values(array_filter(array_map($text,$accepted),fn($v)=>$v!==''));
            if(!$accepted)$pending=true;
            else $correct=$text($answer)!==''&&in_array($text($answer),$accepted,true);
        }elseif($type==='matching type'){
            $pairs=$q['pairs']??[];$earned=0.0;
            if(!$pairs){$pending=true;continue;}
            foreach($pairs as $i=>$pair)if($text($answer[$i]??'')!==''&&$text($answer[$i])===$text($pair['target']??''))$earned+=$points/count($pairs);
            $score+=$earned;continue;
        }elseif($type==='enumeration'){
            $rawItems=$q['items']??[];$items=array_map(fn($v)=>is_array($v)?($v['text']??''):$v,$rawItems);
            if(!$items){$pending=true;continue;}
            $used=[];$earned=0.0;
            $required=max(1,(int)($q['requiredCount']??count($items)));
            foreach(array_slice(is_array($answer)?array_values($answer):[],0,$required) as $value)foreach($items as $i=>$expectedItem){
                $alternatives=$q['itemAlternatives'][$i]??(is_array($rawItems[$i])?($rawItems[$i]['alternatives']??[]):[]);
                if(!isset($used[$i])&&$text($value)!==''&&in_array($text($value),array_map($text,array_merge([$expectedItem],$alternatives)),true)){
                    $used[$i]=true;$earned+=isset($q['itemPoints'][$i])?max(0,(float)$q['itemPoints'][$i]):$points/$required;break;
                }
            }
            $score+=min($points,$earned);continue;
        }elseif(in_array($type,['essay','paragraph'],true)&&$mode==='auto')$correct=$text($answer)!=='';
        else $pending=true; // Written and unsupported types require the assigned teacher's review.
        if($correct)$score+=$points;
    }
    if($maximum<=0)throw new InvalidArgumentException('The saved quiz must have a positive points total.');
    return ['score'=>$score,'maxScore'=>$maximum,'isPending'=>$pending];
}

function assessmentSubmitQuiz(PDO $db,array $actor,array $subject,array $section,array $input): array {
    if(academicRole($actor)!=='student')throw new RuntimeException('Only the enrolled student can submit a quiz.');
    if(strtolower($section['status']??'')!=='deployed'||strtolower($subject['status']??'')!=='published')throw new RuntimeException('This class is not deployed.');
    if(!sigmaActorPermission($actor,'studentGrades'))throw new RuntimeException('Assessment access is disabled for this account.');
    $item=academicResolvedItem($db,$subject,$section,academicItem($subject,$input));
    $release=academicRelease($db,$subject,$section,$item,(string)$actor['id']);
    if(!$release)throw new RuntimeException('This assessment is not released to you.');
    $config=academicRead($db,'release',$subject,$section,'','assessments')??[];
    $answers=$input['answers']??null;
    if(!is_array($answers)||strlen(json_encode($answers))>90000)throw new InvalidArgumentException('Invalid quiz answers.');
    $identity=trim((string)($input['attemptIdentity']??''));
    if($identity===''||strlen($identity)>120)throw new InvalidArgumentException('A submission identity is required.');
    // Serialize first attempts as well as retries; a missing record cannot itself provide a row lock.
    $lock=$db->prepare('SELECT id FROM subjects WHERE id=? FOR UPDATE');$lock->execute([$subject['id']]);
    $previous=academicRead($db,'submission',$subject,$section,$actor['id'],$item['id']);
    if($previous&&($previous['attemptIdentity']??'')===$identity){
        if(($previous['answers']??[])==$answers)return $previous;
        throw new RuntimeException('This quiz attempt was already submitted. Refresh to open your saved attempt.');
    }
    $history=is_array($previous['history']??null)?array_values($previous['history']):[];
    $attemptsUsed=$previous?max((int)($previous['attemptsUsed']??1),count($history)):0;
    $extraAttempts=max(0,(int)($previous['extraAttempts']??0));
    $attemptLimit=assessmentSubmissionLimit($item,$config)+$extraAttempts;
    $hasGrantedAttempt=$previous&&$extraAttempts>0&&$attemptsUsed<$attemptLimit;
    $due=$release['dueAt'];$late=$config['assessmentLatePermissions'][$item['id']]??$item['data']['latePermission']??true;
    if($due&&academicTime($due)<time()&&!$late&&!$hasGrantedAttempt)throw new RuntimeException('This assessment is closed. Ask your teacher to allow another attempt.');
    if($previous&&$attemptsUsed>=$attemptLimit)throw new RuntimeException('The maximum quiz attempts have been reached. Ask your teacher to allow another attempt.');
    if($previous&&!$history){
        $previousScore=academicRead($db,'score',$subject,$section,(string)$actor['id'],$item['id']);
        $history[]=['attemptIdentity'=>$previous['attemptIdentity']??'','attemptNumber'=>max(1,$attemptsUsed),
            'submittedAt'=>$previous['submittedAt']??$previous['completedAt']??gmdate('c'),'completedAt'=>$previous['completedAt']??$previous['submittedAt']??gmdate('c'),
            'score'=>$previousScore['score']??$previous['score']??null,'maxScore'=>$previousScore['maxScore']??$previous['maxScore']??null,
            'status'=>$previous['status']??'Submitted','isPending'=>(bool)($previous['isPending']??false),
            'teacherSaved'=>!empty($previous['teacherSaved'])||!empty($previousScore)];
    }
    $questions=assessmentQuestions($db,$item);
    $settings=['gradingMode'=>assessmentReleaseSetting($config,'assessmentGradingModes',$item,$item['data']['gradingMode']??$item['data']['scoringMethod']??'auto'),
        'essayGradingMode'=>assessmentReleaseSetting($config,'assessmentEssayGradingModes',$item,'manual'),
        'manualReviewTypes'=>assessmentReleaseSetting($config,'assessmentManualReviewTypes',$item,$item['data']['manualReviewTypes']??[])];
    $grade=assessmentGrade($questions,$answers,$settings);
    $maximum=academicMaximum($item)??$grade['maxScore'];
    $score=round($grade['score']*$maximum/$grade['maxScore'],4);
    $title=$item['data']['title']??$item['data']['name']??'Quiz';
    $now=gmdate('c');$quizId=(string)($item['data']['selectedQuizId']??$item['data']['quizId']??$item['id']);
    $attemptNumber=$attemptsUsed+1;
    $history[]=['attemptIdentity'=>$identity,'attemptNumber'=>$attemptNumber,'submittedAt'=>$now,'completedAt'=>$now,
        'score'=>$score,'autoScore'=>$score,'maxScore'=>$maximum,'status'=>$grade['isPending']?'Pending':'Graded',
        'isPending'=>$grade['isPending'],'teacherSaved'=>!$grade['isPending'],'title'=>$title,'quizTitle'=>$title,'quizId'=>$quizId];
    foreach($history as $index=>&$attempt)$attempt['attemptNumber']=$index+1;
    unset($attempt);
    $record=['studentId'=>(string)$actor['id'],'studentName'=>$actor['full_name']??'',
        'subjectId'=>(string)$subject['id'],'section'=>$section['name'],'sectionId'=>$section['id'],'schoolYear'=>$section['school_year'],
        'materialId'=>$item['id'],'assessmentId'=>$item['id'],'quizId'=>$quizId,'title'=>$title,'quizTitle'=>$title,
        'topicIdx'=>$item['topicIdx'],'topicItemIdx'=>$item['itemIdx'],'activeIdx'=>$item['itemIdx'],'tab'=>'assessments',
        'quarter'=>$item['data']['quarter']??'','category'=>'quiz','answers'=>$answers,'userAnswers'=>$answers,'questions'=>$questions,
        'essayGradingMode'=>$settings['essayGradingMode'],'manualReviewTypes'=>$settings['manualReviewTypes'],
        'score'=>$score,'autoScore'=>$score,'maxScore'=>$maximum,'totalPoints'=>$maximum,'isPending'=>$grade['isPending'],
        'status'=>$grade['isPending']?'Pending':'Graded','teacherSaved'=>!$grade['isPending'],'attemptsUsed'=>$attemptNumber,
        'extraAttempts'=>$extraAttempts,'allowResubmitGranted'=>$extraAttempts>0,'history'=>$history,
        'attemptIdentity'=>$identity,'submittedAt'=>$now,'completedAt'=>$now,'files'=>[['name'=>$title,'url'=>'quiz','type'=>'quiz']]];
    academicWrite($db,$actor,'submission',$subject,$section,$actor['id'],$item['id'],$record);
    if(!$grade['isPending'])academicWrite($db,$actor,'score',$subject,$section,$actor['id'],$item['id'],
        ['score'=>$score,'maxScore'=>$maximum,'attemptIdentity'=>$identity,'source'=>'quiz-auto','feedback'=>'']);
    return $record;
}

function assessmentShowCorrectAnswers(array $config,array $item): bool {
    $data=$item['data']??$item;
    $map=$config['assessmentShowCorrectAnswers']??[];
    foreach(array_unique(array_filter([$item['id']??null,$data['materialId']??null,$data['id']??null,$data['title']??null,$data['name']??null,$data['selectedQuizId']??null,$data['quizId']??null],fn($key)=>$key!==null&&$key!=='')) as $key){
        if(array_key_exists($key,$map))return (bool)$map[$key];
    }
    return array_key_exists('showCorrectAnswers',$data)?(bool)$data['showCorrectAnswers']:true;
}

// Review feedback describes only this submitted response; it never contains the answer key.
function assessmentQuestionReview(array $question,$answer,int $index,array $record): array {
    $type=strtolower(trim($question['type']??'Multiple Choice'));
    $answered=function($value)use(&$answered):bool {
        if(is_array($value))return count(array_filter($value,$answered))>0;
        return $value!==null&&trim((string)$value)!=='';
    };
    $settings=['essayGradingMode'=>$record['essayGradingMode']??'manual','manualReviewTypes'=>$record['manualReviewTypes']??[]];
    // A zero-point question still needs response feedback, while contributing zero points.
    $gradingQuestion=$question;
    if((float)($question['points']??10)<=0)$gradingQuestion['points']=1;
    $grade=assessmentGrade([$gradingQuestion],[$answer],$settings);
    $maximum=(float)($question['points']??10)<=0?0.0:$grade['maxScore'];
    $earned=$maximum>0?$grade['score']:0.0;
    $pending=$grade['isPending'];
    $items=[];
    if($type==='matching type')foreach($question['pairs']??[] as $i=>$pair){
        $single=$question;$single['pairs']=[$pair];unset($single['itemPoints']);$single['points']=1;
        $value=is_array($answer)?($answer[$i]??''):'';
        $items[]=assessmentGrade([$single],[[$value]],['essayGradingMode'=>'auto'])['score']>0;
    }
    if($type==='enumeration'){
        $used=[];$values=is_array($answer)?array_values($answer):[];
        foreach(array_slice($values,0,max(1,(int)($question['requiredCount']??count($question['items']??[])))) as $value){
            $matched=false;
            foreach($question['items']??[] as $i=>$item){
                if(isset($used[$i]))continue;
                $single=$question;$single['items']=[$item];$single['requiredCount']=1;$single['points']=1;
                $single['itemAlternatives']=[$question['itemAlternatives'][$i]??[]];unset($single['itemPoints']);
                if(assessmentGrade([$single],[[$value]],['essayGradingMode'=>'auto'])['score']>0){$used[$i]=true;$matched=true;break;}
            }
            $items[]=$matched;
        }
    }
    if($pending){
        $scores=$record['essayScores']??[];
        foreach(['qidx:'.$index,$question['id']??'q-'.($index+1),$index] as $key){
            if(isset($scores[$key])&&is_numeric($scores[$key])){$earned=max(0,min($maximum,(float)$scores[$key]));$pending=false;break;}
        }
        if($type==='enumeration'&&isset($record['enumItemScores'][$index.'_0'])){
            $earned=0.0;$items=[];
            foreach($values as $i=>$value){$points=(float)($record['enumItemScores'][$index.'_'.$i]??0);$earned+=max(0,$points);$items[]=$points>0;}
            $earned=min($maximum,$earned);$pending=false;
        }
    }
    $total=$type==='enumeration'?max(1,(int)($question['requiredCount']??count($question['items']??[]))):($type==='matching type'?max(1,count($question['pairs']??[])):1);
    $correct=$items?count(array_filter($items)):($answered($answer)&&!$pending&&($maximum>0?$earned>=$maximum:$grade['score']>0)?1:0);
    return ['earned'=>$earned,'max'=>$maximum,'pending'=>$pending,'correct'=>$correct,'total'=>$total,
        'isAnswered'=>$answered($answer),'isFullyCorrect'=>!$pending&&$correct===$total,
        'hasPartial'=>$correct>0&&$correct<$total,'isEssay'=>in_array($type,['essay','paragraph'],true),'itemCorrect'=>$items];
}

function assessmentPublicRecord(array $record,bool $showAnswers): array {
    $record['showCorrectAnswers']=$showAnswers;
    $answers=array_replace($record['answers']??[],$record['userAnswers']??[]);
    foreach(['questions','quizQuestions'] as $questionField)foreach($record[$questionField]??[] as $i=>$question){
        if($showAnswers)continue;
        $answer=$answers[$i]??$answers['qidx:'.$i]??$answers[$question['id']??'q-'.($i+1)]??$question['studentAnswer']??$question['userAnswer']??$question['response']??$question['submittedAnswer']??'';
        $question['reviewResult']=assessmentQuestionReview($question,$answer,(int)$i,$record);
        foreach(['answer','answers','answerIndex','correct','correctAnswer','correctIndex','explanation','acceptedAnswers','acceptableAnswers','alternatives','alternateAnswers','sampleAnswer','answerKey','rubric','notes'] as $field)unset($question[$field]);
        foreach($question['choices']??[] as $j=>$choice)if(is_array($choice)){
            unset($choice['correct'],$choice['isCorrect']);$question['choices'][$j]=$choice;
        }
        foreach($question['pairs']??[] as $j=>$pair){unset($pair['target']);$question['pairs'][$j]=$pair;}
        unset($question['items'],$question['itemAlternatives']);
        $record[$questionField][$i]=$question;
    }
    foreach(['attempts','history'] as $field)foreach($record[$field]??[] as $i=>$attempt)if(is_array($attempt))$record[$field][$i]=assessmentPublicRecord($attempt,$showAnswers);
    return $record;
}

function assessmentSnapshot(PDO $db,array $actor,?array $onlyScope=null): array {
    $role=academicRole($actor);$student=$role==='student';$scopes=[];
    if(!academicAdmin($actor)&&!sigmaActorPermission($actor,$student?'studentGrades':'teacherGrades'))throw new RuntimeException('Assessment access is disabled for this account.');
    $subjects=$db->query('SELECT * FROM subjects WHERE is_deleted=0')->fetchAll(PDO::FETCH_ASSOC);
    $sections=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll(PDO::FETCH_ASSOC);
    foreach($sections as $section)foreach($subjects as $subject){
        if($onlyScope&&(string)$section['id']!==(string)$onlyScope['section']['id'])continue;
        if($onlyScope&&(string)$subject['id']!==(string)$onlyScope['subject']['id'])continue;
        if(!academicSectionSubjects($section,$subject))continue;
        if($student?(strtolower($section['status'])!=='deployed'||strtolower($subject['status'])!=='published'||!gradeStudent($section,$actor)):
            !(academicAdmin($actor)||($role==='teacher'&&academicTeacher($section,$actor,$subject))))continue;
        // Read class releases with its assessment records instead of three extra round trips.
        $q=$db->prepare("SELECT record_type,item_id,student_id,payload FROM academic_records WHERE subject_id=? AND section_id=? AND record_type IN ('release','submission','score','evaluation','feedback','rubric','teacher_feedback')".($student?" AND (student_id=? OR (record_type='release' AND student_id=''))":''));
        $q->execute($student?[$subject['id'],$section['id'],$actor['id']]:[$subject['id'],$section['id']]);$records=[];
        $savedRows=$q->fetchAll(PDO::FETCH_ASSOC);$byType=[];
        foreach($savedRows as $row)$byType[$row['record_type']][$row['student_id']][$row['item_id']]=json_decode($row['payload'],true)?:[];
        $releases=[];foreach(['topics','learning','assessments'] as $category)$releases[$category]=$byType['release'][''][$category]??[];
        $resolved=[];
        foreach($savedRows as $row){
            $type=$row['record_type'];$id=$row['item_id'];$sid=$row['student_id'];$payload=$byType[$type][$sid][$id];
            if(in_array($type,['release','rubric','teacher_feedback'],true)||($student&&$type==='evaluation'))continue;
            if(in_array($type,['evaluation','feedback'],true)){
                $submission=$byType['submission'][$sid][$id]??null;$rubric=$byType['rubric'][''][$id]??null;
                // Rubrics use the class-wide empty student key, including in student snapshots.
                if($student&&$type==='evaluation')$rubric=academicRead($db,'rubric',$subject,$section,'',$id);
                try{$item=$resolved[$id]??=academicResolvedItem($db,$subject,$section,academicItem($subject,['itemId'=>$id]),$releases['assessments']);}catch(Throwable $e){continue;}
                if(($payload['attemptIdentity']??'')!==($submission['attemptIdentity']??''))continue;
                if($type==='evaluation' && (($payload['rubricFingerprint']??'')!==hash('sha256',json_encode($rubric))||($payload['curriculumFingerprint']??'')!==hash('sha256',json_encode($item))))continue;
                if($type==='feedback'){
                    $note=$byType['teacher_feedback'][$sid][$id]??null;
                    if($student&&empty($payload['feedbackPolicy'])){
                        $rubric=academicRead($db,'rubric',$subject,$section,'',$id);
                        $note=academicRead($db,'teacher_feedback',$subject,$section,$sid,$id);
                    }
                    if(!sigmaSubmissionFeedbackRecordIsCurrent($payload,$submission,$byType['score'][$sid][$id]??null,$rubric,$item,$note))continue;
                }
                if($student&&!academicReleaseFromConfig($releases['assessments'],$item,(string)$actor['id']))continue;
                $records[]=['type'=>$type,'itemId'=>$id,'studentId'=>$sid,'data'=>$payload];continue;
            }
            try{$reviewItem=$resolved[$id]??=academicResolvedItem($db,$subject,$section,academicItem($subject,['itemId'=>$id]),$releases['assessments']);}catch(Throwable $error){$reviewItem=['id'=>$id,'data'=>$payload];}
            $show=!$student||assessmentShowCorrectAnswers($releases['assessments'],$reviewItem);
            $records[]=['type'=>$type,'itemId'=>$id,'studentId'=>$sid,'data'=>assessmentPublicRecord($payload,$show)];
        }
        $scopes[]=['subjectId'=>$subject['id'],'subject'=>$subject['name'],'aliases'=>academicAliases($subject),
            'sectionId'=>$section['id'],'section'=>$section['name'],'schoolYear'=>$section['school_year'],'releases'=>$releases,'records'=>$records,'aiResultsIncluded'=>true];
    }
    return ['success'=>true,'userId'=>(string)$actor['id'],'scopes'=>$scopes];
}
