<?php
require_once __DIR__.'/ai_routing_config.php';

class QuizAiProviderException extends RuntimeException {
    public function __construct(string $message, public int $httpStatus, public int $retryAfter=0) { parent::__construct($message); }
}

/** Only consider supported text models actually advertised by the saved key. */
function quizAiAlternativeKeys(array $key, callable $discover): array {
    $catalog=$discover($key['api_key']);
    $available=array_column($catalog['models']??[],'id');
    $preferred=$key['provider']==='groq'
        ? ['openai/gpt-oss-120b','openai/gpt-oss-20b','llama-3.3-70b-versatile','llama-3.1-8b-instant']
        : array_values(array_filter($available,fn($id)=>preg_match('/^gemini-[0-9.]+-flash(?:-lite)?$/D',$id)));
    if($key['provider']==='gemini')usort($preferred,fn($a,$b)=>((int)str_ends_with($b,'-lite')<=>(int)str_ends_with($a,'-lite'))?:strnatcmp($b,$a));
    $result=[];
    foreach($preferred as $model)if($model!==$key['model']&&in_array($model,$available,true))$result[]=array_replace($key,['model'=>$model]);
    return array_slice($result,0,2);
}

function quizAiResponseSchema(array $blueprint): array {
    $text=['type'=>'string'];$variants=[];
    foreach(array_keys($blueprint['counts']) as $type){
        $properties=['type'=>['type'=>'string','enum'=>[$type]],'question'=>$text,
            // Only type is an enum discriminator: Groq rejects multiple enum
            // discriminators in an anyOf. Validate selected levels after decoding.
            'bloomLevel'=>$text,'bloomRationale'=>$text];
        if($type==='Multiple Choice'){$properties['choices']=['type'=>'array','items'=>$text,'minItems'=>4,'maxItems'=>4];$properties['answer']=$text;}
        elseif($type==='True or False')$properties['answer']=['type'=>'string','enum'=>['True','False']];
        elseif($type==='Matching Type')$properties['pairs']=['type'=>'array','minItems'=>2,'maxItems'=>10,'items'=>[
            'type'=>'object','properties'=>['premise'=>$text,'target'=>$text],'required'=>['premise','target'],'additionalProperties'=>false]];
        elseif($type==='Enumeration')$properties['items']=['type'=>'array','minItems'=>1,'maxItems'=>10,'items'=>$text];
        else $properties['answer']=$text;
        $variants[]=['type'=>'object','properties'=>$properties,'required'=>array_keys($properties),'additionalProperties'=>false];
    }
    return ['type'=>'object','properties'=>['questions'=>['type'=>'array','minItems'=>array_sum($blueprint['counts']),
        'maxItems'=>array_sum($blueprint['counts']),'items'=>count($variants)===1?$variants[0]:['anyOf'=>$variants]]],
        'required'=>['questions'],'additionalProperties'=>false];
}

function quizAiProviderRequest(string $url,array $headers,array $body): array {
    $retryAfter=0;
    $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($body,JSON_THROW_ON_ERROR),
        CURLOPT_HTTPHEADER=>array_merge(['Content-Type: application/json'],$headers),CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>25,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_FOLLOWLOCATION=>false,
        CURLOPT_HEADERFUNCTION=>function($ch,$line)use(&$retryAfter){if(preg_match('/^retry-after:\s*(\d+)/i',$line,$m))$retryAfter=(int)$m[1];return strlen($line);}]);
    $raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    $data=is_string($raw)?json_decode($raw,true):null;
    if($raw===false||$code<200||$code>=300){
        $message=(string)($data['error']['message']??'');
        if($code===429){
            // Parse the provider's duration, but never expose account IDs or raw provider errors.
            if(preg_match('/(?:try again|retry) in\s+(?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i',$message,$m))$retryAfter=max($retryAfter,(int)ceil(($m[1]?:0)*3600+($m[2]?:0)*60+(float)$m[3]));
            foreach($data['error']['details']??[] as $detail)if(preg_match('/^([\d.]+)s$/',$detail['retryDelay']??'',$m))$retryAfter=max($retryAfter,(int)ceil((float)$m[1]));
            $wait=$retryAfter?' Try again in about '.($retryAfter>=3600?ceil($retryAfter/3600).' hour(s).':max(1,(int)ceil($retryAfter/60)).' minute(s).'):' Try again shortly.';
            throw new QuizAiProviderException('AI capacity is temporarily used up.'.$wait,$code,$retryAfter);
        }
        throw new QuizAiProviderException(in_array($code,[400,401,403,404],true)
            ? 'The AI service rejected the saved key, model, or request. Check AI Integration settings.'
            : 'The AI service did not respond in time. Try again.',$code);
    }
    if(!is_array($data))throw new QuizAiProviderException('The AI service returned an unreadable response. Try again.',502);
    return $data;
}
