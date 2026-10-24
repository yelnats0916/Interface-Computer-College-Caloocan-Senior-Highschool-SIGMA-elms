<?php
require_once __DIR__ . '/../php/includes/quiz_ai_generation.php';
function verify($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$services = ['ai_vault' => [
    ['id' => 'gem', 'provider' => 'gemini', 'model' => 'gemini-test', 'api_key' => 'fake-gemini-key'],
    ['id' => 'gro', 'provider' => 'groq', 'model' => 'llama-test', 'api_key' => 'fake-groq-key']
], 'ai_routing' => ['features' => ['quiz' => 'groq'], 'defaults' => ['gemini' => 'gem', 'groq' => 'gro'], 'allow_fallback' => false]];
$input = ['source' => 'An integer stores whole numbers.', 'count' => 1, 'type' => 'Multiple Choice', 'difficulty' => 'Medium', 'provider' => 'gemini'];
$quiz = ['questions' => [['type' => 'Multiple Choice', 'question' => 'What does an integer store?', 'choices' => ['Whole numbers', 'Files', 'Images', 'Video'], 'answer' => 'Whole numbers', 'points' => 100, 'bloomLevel'=>'Understand','bloomRationale'=>'Interprets the meaning of an integer.']]];
$result = generateQuizAi($services, $input, function($url, $headers, $body) use ($quiz) {
    verify($url === 'https://api.groq.com/openai/v1/chat/completions', 'Must use Groq endpoint from central routing');
    verify($body['model'] === 'llama-test', 'Saved model must be used');
    verify(in_array('Authorization: Bearer fake-groq-key', $headers), 'Stored key stays server-side');
    return ['choices' => [['message' => ['content' => json_encode($quiz)]]]];
});
verify($result['provider'] === 'groq' && $result['model'] === 'llama-test', 'Return actual model/provider');
verify($result['questions'][0]['points'] === 1, 'Generated question points must have a usable default');
verify(strpos(json_encode($result), 'fake-groq-key') === false, 'Response must never expose key');
$services['ai_routing']['allow_fallback'] = true;
$calls = 0;
$result = generateQuizAi($services, $input, function($url) use (&$calls, $quiz) {
    $calls++;
    if ($calls === 1) throw new RuntimeException('Simulated quota error');
    verify(strpos($url, '/models/gemini-test:generateContent') !== false, 'Fallback uses Gemini saved model');
    return ['candidates' => [['content' => ['parts' => [['text' => json_encode($quiz)]]]]]];
});
verify($result['status'] === 'Fallback Used' && $result['provider'] === 'gemini', 'Record actual fallback');
$services['ai_routing']['allow_fallback'] = false;
$calls = 0;
try {
    generateQuizAi($services, $input, function() use (&$calls) { $calls++; throw new RuntimeException('Simulated provider error'); });
    throw new LogicException('Failure must not produce fake questions');
} catch (RuntimeException $error) { verify($calls === 1, 'No fallback without permission'); }
try { validateQuizAiQuestions([['type' => 'Essay', 'question' => 'Wrong type', 'answer' => 'Answer']], 1, 'Multiple Choice'); throw new LogicException('Invalid type accepted'); } catch (RuntimeException $expected) {}
try { generateQuizAi($services, $input + [], function() { return []; }); throw new LogicException('Invalid output accepted'); } catch (RuntimeException $expected) {}
$mixed=['source'=>'Source','count'=>2,'type'=>'Mixed','typeCounts'=>[['type'=>'Multiple Choice','count'=>1],['type'=>'True or False','count'=>1]],'bloomLevel'=>'Apply','instructions'=>'Focus on section 2.'];
verify(quizAiBlueprint($mixed,2,'Mixed')['counts']['True or False']===1,'Explicit mixed distribution');
foreach([
 array_replace($mixed,['typeCounts'=>[['type'=>'Multiple Choice','count'=>2],['type'=>'Multiple Choice','count'=>1]]]),
 array_replace($mixed,['count'=>3]),
 array_replace($mixed,['bloomLevel'=>'Create']),
 array_replace($mixed,['bloomLevel'=>'Invented'])
] as $invalid){try{quizAiBlueprint($invalid,$invalid['count'],'Mixed');throw new LogicException('Invalid blueprint accepted');}catch(InvalidArgumentException $expected){}}
$create=quizAiBlueprint(['bloomLevel'=>'Create'],1,'Essay');verify($create['bloomLevel']==='Create','Create supported with essay grading guide');
echo "PASS: central routing, stored keys/model, Groq/Gemini requests, fallback policy, exact model metadata, default points, malformed output rejection.\n";

$large=array_replace($input,['count'=>100,'type'=>'Mixed','typeCounts'=>[['type'=>'Multiple Choice','count'=>60],['type'=>'True or False','count'=>40]],'bloomLevel'=>'Understand']);
$batchCalls=0;$serial=0;$largest=0;
$result=generateQuizAi($services,$large,function($url,$headers,$body)use(&$batchCalls,&$serial,&$largest){
    $batchCalls++;$prompt=$body['messages'][0]['content'];preg_match('/exactly ([0-9]+) questions/',$prompt,$match);$n=(int)$match[1];$largest=max($largest,$n);
    preg_match('/distribution: (\{.*?\})\./',$prompt,$match);$distribution=json_decode($match[1],true);$rows=[];
    foreach($distribution as $type=>$count)for($i=0;$i<$count;$i++){$serial++;$rows[]=['type'=>$type,'question'=>'Question '.$serial,'choices'=>['A','B','C','D'],'answer'=>$type==='True or False'?'True':'A','bloomLevel'=>'Understand','bloomRationale'=>'Interprets the lesson.'];}
    return ['choices'=>[['message'=>['content'=>json_encode(['questions'=>$rows])]]]];
});
verify(count($result['questions'])===100,'Full 100-question request completed');verify($batchCalls===5&&$largest===20,'Provider requests are bounded batches');
$histogram=array_count_values(array_column($result['questions'],'type'));verify($histogram['Multiple Choice']===60&&$histogram['True or False']===40,'Exact 100-question type distribution');
try{generateQuizAi($services,array_replace($input,['count'=>101]),fn()=>[]);throw new LogicException('Over-limit generation accepted');}catch(InvalidArgumentException $expected){}
echo "PASS 100 questions in five validated provider batches, exact mixed counts, and rejection above 100.\n";

$multi=['source'=>'Source lesson','type'=>'Mixed','count'=>12,'typeCounts'=>[['type'=>'Multiple Choice','count'=>10],['type'=>'Essay','count'=>2]],'bloomLevels'=>['Remember','Understand','Apply','Analyze','Evaluate','Create']];
$plan=quizAiBlueprint($multi,12,'Mixed');verify(count($plan['bloomLevels'])===6,'All six skills selected');verify(array_sum($plan['bloomCounts'])===12,'Skill allocation total');
foreach($plan['allocations'] as $allocation)if($allocation['level']==='Create')verify($allocation['type']==='Essay','Create uses essay only');
$serial=0;$multiResult=generateQuizAi($services,$multi,function($url,$headers,$body)use(&$serial){
    $prompt=$body['messages'][0]['content'];preg_match('/allocation: (\[.*?\])\./',$prompt,$match);$allocations=json_decode($match[1],true);$rows=[];
    foreach($allocations as $allocation)for($i=0;$i<$allocation['count'];$i++)$rows[]=['type'=>$allocation['type'],'question'=>'Multi question '.(++$serial),'choices'=>['A','B','C','D'],'answer'=>'A','bloomLevel'=>$allocation['level'],'bloomRationale'=>'Tests the selected thinking skill.'];
    return ['choices'=>[['message'=>['content'=>json_encode(['questions'=>$rows])]]]];
});
verify(count(array_unique(array_column($multiResult['questions'],'bloomLevel')))===6,'Actual generated questions cover all selected skills');
foreach([array_replace($multi,['count'=>5]),array_replace($multi,['bloomLevels'=>[]]),array_replace($multi,['bloomLevels'=>['Understand','Understand']])] as $bad){try{quizAiBlueprint($bad,$bad['count'],'Mixed');throw new LogicException('Invalid level selections accepted');}catch(InvalidArgumentException $expected){}}
echo "PASS multi-select Bloom allocation, coverage of all selected skills, Create/Essay compatibility and invalid combinations.\n";
