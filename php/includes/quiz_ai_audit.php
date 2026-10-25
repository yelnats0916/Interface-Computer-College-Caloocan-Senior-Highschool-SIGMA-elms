<?php
require_once __DIR__.'/ai_record_store.php';
/** Persist generation on the server, before the browser polls its completed job. */
function sigmaRecordQuizResult(PDO $db,string $owner,array $input,array $result,?int $timestamp=null): void {
    $count=count($result['questions']??[]);
    $response=json_encode($result['questions']??[],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    if(strlen($response)>96000)$response="Generated $count questions.";
    saveAiLog($db,['id'=>$result['generationId'],'generationId'=>$result['generationId'],'userId'=>$owner,'feature'=>'quiz',
        'timestamp'=>gmdate('c',$timestamp??time()),'prompt'=>'Generate '.$count.' '.($input['type']??'quiz').' questions'.(!empty($input['topic'])?' about '.mb_substr($input['topic'],0,300):''),
        'response'=>$response,'actionDescription'=>'Generated '.$count.' quiz questions','model'=>$result['model'],'provider'=>$result['provider'],
        'keyId'=>$result['keyId']??'','keyLabel'=>$result['keyLabel']??'','status'=>$result['status']]);
}
