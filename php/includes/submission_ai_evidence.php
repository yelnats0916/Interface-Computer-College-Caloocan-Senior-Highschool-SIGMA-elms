<?php
require_once __DIR__.'/sigma_learning_files.php';

function sigmaRequireSubmissionEvaluationEnabled(array $item, bool $feedback): void {
    $data=$item['data'];
    $enabled=$data['aiAssisted']??$data['isAiAssisted']??$data['aiAssistant']??(($data['gradingMode']??'')==='ai');
    if(!$feedback&&!filter_var($enabled,FILTER_VALIDATE_BOOLEAN))throw new InvalidArgumentException('AI grading evaluation is disabled for this assessment.');
}

// All paths and content come from authorized database records, never browser file references.
function sigmaSubmissionAiEvidence(PDO $db,array $subject,array $section,array $student,array $item,array $submission,?array $score,?array $rubric,bool $feedback,?callable $readFile=null): array {
    sigmaRequireSubmissionEvaluationEnabled($item,$feedback);
    if($feedback&&(!$score||!is_numeric($score['score']??null)||!hash_equals((string)$submission['attemptIdentity'],(string)($score['attemptIdentity']??''))))throw new InvalidArgumentException('Save a grade for this submission attempt before generating feedback.');
    $readFile=$readFile??'sigmaLearningFileText';
    $text=trim((string)($submission['text']??''));
    if(!$text){
        $parts=[];
        foreach(array_slice($submission['files']??[],0,10) as $file){
            $part=$readFile($file,true);
            if(!$part)throw new InvalidArgumentException('The submitted file could not be read. Use a text-readable PDF, DOCX, or text document.');
            $parts[]=$part;
        }
        $text=implode("\n\n",$parts);
    }
    if(!$text||mb_strlen($text)>60000)throw new InvalidArgumentException('The saved submission needs readable text of at most 60,000 characters.');
    $rubricText=trim((string)($rubric['text']??academicText($item['data']['rubricText']??'',60000)));
    if(!$rubricText){
        $url=$item['data']['rubricUrl']??$item['data']['rubricFileUrl']??'';
        if($url)$rubricText=$readFile(['url'=>$url,'name'=>$item['data']['rubricFileName']??$item['data']['rubricName']??''],true);
        if($url&&!$rubricText)throw new InvalidArgumentException('The saved grading rubric could not be read. Check its uploaded file.');
    }
    $teacherRubricProvided=trim((string)$rubricText)!=='';
    $criteriaMap=['content'=>'Content and Understanding','process'=>'Process and Methodology','organization'=>'Organization and Structure','analysis'=>'Critical Analysis and Insight'];
    $autoSelect=($item['data']['criteriaAiAuto']??true)!==false;
    $selected=$item['data']['selectedCriteria']??[];
    $selected=is_array($selected)?array_values(array_filter($selected,fn($value)=>is_string($value)||is_numeric($value))):[];
    if(!$autoSelect&&is_array($item['data']['criteria']??null)&&$item['data']['criteria']){
        $customCriteria=[];foreach($item['data']['criteria'] as $i=>$criterion){
            $id=is_array($criterion)?(string)($criterion['id']??'c-'.$i):'c-'.$i;
            $title=is_array($criterion)?academicText($criterion['title']??$criterion['name']??'',200):academicText($criterion,200);
            if($title)$customCriteria[$id]=$title;
        }
        if($customCriteria)$criteriaMap=$customCriteria;
    }
    $criteria=[];foreach($criteriaMap as $id=>$title)if($autoSelect||!$selected||in_array($id,$selected,true)||in_array($title,$selected,true))$criteria[]=['id'=>$id,'title'=>$title];
    if(!$criteria){$criteriaMap=['content'=>'Content and Understanding','process'=>'Process and Methodology','organization'=>'Organization and Structure','analysis'=>'Critical Analysis and Insight'];foreach($criteriaMap as $id=>$title)$criteria[]=['id'=>$id,'title'=>$title];$autoSelect=true;}
    if(!$teacherRubricProvided){
        $rubricText="No teacher-authored rubric is attached. Use the task instructions and the following broad criteria only: ".implode('; ',array_column($criteria,'title')).". Treat the criteria as equally weighted unless the task instructions specify otherwise. Do not invent task requirements, deductions, or point weights.";
    }
    $maximum=academicMaximum($item);
    if($maximum===null&&is_numeric($score['maxScore']??null)&&$score['maxScore']>0)$maximum=(float)$score['maxScore'];
    if($maximum===null&&is_numeric($submission['maxScore']??null)&&$submission['maxScore']>0)$maximum=(float)$submission['maxScore'];
    if($maximum===null)$maximum=100.0;
    return ['title'=>academicText($item['data']['title']??$item['data']['name']??'',200),'instructions'=>academicText($item['data']['instructions']??$item['data']['description']??'',10000),
        'assessmentType'=>(string)($item['data']['type']??$item['data']['category']??'assessment'),'isQuiz'=>academicIsDigitalQuiz($item),
        'maxScore'=>$maximum,'rubricText'=>$rubricText,'rubricProvided'=>$teacherRubricProvided,'submissionText'=>$text,'criteria'=>$criteria,
        'autoSelect'=>$autoSelect,'mode'=>$feedback?'feedback':'evaluation','teacherScore'=>$feedback?null:($score['score']??null),'teacherFeedback'=>$feedback?'':academicText((academicRead($db,'teacher_feedback',$subject,$section,$student['id'],$item['id'])['text']??'').' '.($score['feedback']??''),5000)];
}
