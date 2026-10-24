<?php
require_once __DIR__.'/academic_evidence.php';

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
        $mode=$settings['essayGradingMode']??'manual';$manual=$settings['manualReviewTypes']??[];
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
    $due=$release['dueAt'];$late=$config['assessmentLatePermissions'][$item['id']]??$item['data']['latePermission']??true;
    if($due&&academicTime($due)<time()&&!$late)throw new RuntimeException('This assessment is closed.');
    $answers=$input['answers']??null;
    if(!is_array($answers)||strlen(json_encode($answers))>90000)throw new InvalidArgumentException('Invalid quiz answers.');
    $identity=trim((string)($input['attemptIdentity']??''));
    if($identity===''||strlen($identity)>120)throw new InvalidArgumentException('A submission identity is required.');
    // Serialize first attempts as well as retries; a missing record cannot itself provide a row lock.
    $lock=$db->prepare('SELECT id FROM subjects WHERE id=? FOR UPDATE');$lock->execute([$subject['id']]);
    $previous=academicRead($db,'submission',$subject,$section,$actor['id'],$item['id']);
    if($previous){
        if(($previous['attemptIdentity']??'')===$identity&&($previous['answers']??[])==$answers)return $previous;
        throw new RuntimeException('This quiz has already been submitted. Open your saved attempt.');
    }
    $questions=assessmentQuestions($db,$item);
    $settings=['essayGradingMode'=>$config['assessmentEssayGradingModes'][$item['id']]??$item['data']['essayGradingMode']??'manual',
        'manualReviewTypes'=>$config['assessmentManualReviewTypes'][$item['id']]??$item['data']['manualReviewTypes']??[]];
    $grade=assessmentGrade($questions,$answers,$settings);
    $maximum=academicMaximum($item)??$grade['maxScore'];
    $score=round($grade['score']*$maximum/$grade['maxScore'],4);
    $title=$item['data']['title']??$item['data']['name']??'Quiz';
    $now=gmdate('c');$quizId=(string)($item['data']['selectedQuizId']??$item['data']['quizId']??$item['id']);
    $record=['studentId'=>(string)$actor['id'],'studentName'=>$actor['full_name']??'',
        'subjectId'=>(string)$subject['id'],'section'=>$section['name'],'sectionId'=>$section['id'],'schoolYear'=>$section['school_year'],
        'materialId'=>$item['id'],'assessmentId'=>$item['id'],'quizId'=>$quizId,'title'=>$title,'quizTitle'=>$title,
        'topicIdx'=>$item['topicIdx'],'topicItemIdx'=>$item['itemIdx'],'activeIdx'=>$item['itemIdx'],'tab'=>'assessments',
        'quarter'=>$item['data']['quarter']??'','category'=>'quiz','answers'=>$answers,'userAnswers'=>$answers,'questions'=>$questions,
        'essayGradingMode'=>$settings['essayGradingMode'],'manualReviewTypes'=>$settings['manualReviewTypes'],
        'score'=>$score,'autoScore'=>$score,'maxScore'=>$maximum,'totalPoints'=>$maximum,'isPending'=>$grade['isPending'],
        'status'=>$grade['isPending']?'Pending':'Graded','teacherSaved'=>!$grade['isPending'],'attemptsUsed'=>1,
        'attemptIdentity'=>$identity,'submittedAt'=>$now,'completedAt'=>$now,'files'=>[['name'=>$title,'url'=>'quiz','type'=>'quiz']]];
    academicWrite($db,$actor,'submission',$subject,$section,$actor['id'],$item['id'],$record);
    if(!$grade['isPending'])academicWrite($db,$actor,'score',$subject,$section,$actor['id'],$item['id'],
        ['score'=>$score,'maxScore'=>$maximum,'attemptIdentity'=>$identity,'source'=>'quiz-auto','feedback'=>'']);
    return $record;
}

function assessmentPublicRecord(array $record,bool $showAnswers): array {
    if(!$showAnswers)foreach($record['questions']??[] as $i=>$question){
        foreach(['answer','answers','answerIndex','correct','correctAnswer','correctIndex','explanation','acceptedAnswers'] as $field)unset($question[$field]);
        foreach($question['choices']??[] as $j=>$choice)if(is_array($choice)){
            unset($choice['correct'],$choice['isCorrect']);$question['choices'][$j]=$choice;
        }
        foreach($question['pairs']??[] as $j=>$pair){unset($pair['target']);$question['pairs'][$j]=$pair;}
        unset($question['items'],$question['itemAlternatives']);
        $record['questions'][$i]=$question;
    }
    return $record;
}

function assessmentSnapshot(PDO $db,array $actor): array {
    $role=academicRole($actor);$student=$role==='student';$scopes=[];
    if(!sigmaActorPermission($actor,$student?'studentGrades':'teacherGrades'))throw new RuntimeException('Assessment access is disabled for this account.');
    $subjects=$db->query('SELECT * FROM subjects WHERE is_deleted=0')->fetchAll(PDO::FETCH_ASSOC);
    $sections=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll(PDO::FETCH_ASSOC);
    foreach($sections as $section)foreach($subjects as $subject){
        if(!academicSectionSubjects($section,$subject))continue;
        if($student?(strtolower($section['status'])!=='deployed'||strtolower($subject['status'])!=='published'||!gradeStudent($section,$actor)):
            !(academicAdmin($actor)||($role==='teacher'&&academicTeacher($section,$actor,$subject))))continue;
        $releases=[];foreach(['topics','learning','assessments'] as $category)$releases[$category]=academicRead($db,'release',$subject,$section,'',$category)??[];
        $q=$db->prepare("SELECT record_type,item_id,student_id,payload FROM academic_records WHERE subject_id=? AND section_id=? AND record_type IN ('submission','score')".($student?' AND student_id=?':''));
        $q->execute($student?[$subject['id'],$section['id'],$actor['id']]:[$subject['id'],$section['id']]);$records=[];
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            $payload=json_decode($row['payload'],true)?:[];
            $show=!$student||!empty($releases['assessments']['assessmentShowCorrectAnswers'][$row['item_id']]);
            $records[]=['type'=>$row['record_type'],'itemId'=>$row['item_id'],'studentId'=>$row['student_id'],'data'=>assessmentPublicRecord($payload,$show)];
        }
        $scopes[]=['subjectId'=>$subject['id'],'subject'=>$subject['name'],'aliases'=>academicAliases($subject),
            'sectionId'=>$section['id'],'section'=>$section['name'],'schoolYear'=>$section['school_year'],'releases'=>$releases,'records'=>$records];
    }
    return ['success'=>true,'userId'=>(string)$actor['id'],'scopes'=>$scopes];
}
