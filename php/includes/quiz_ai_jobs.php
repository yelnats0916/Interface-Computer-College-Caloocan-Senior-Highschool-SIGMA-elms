<?php
require_once __DIR__.'/quiz_ai_generation.php';
require_once __DIR__.'/ai_generation_id.php';
function quizAiJobDirectory(): string {
    $identity=function_exists('posix_geteuid')?(string)posix_geteuid():(getenv('USERNAME')?:'sigma');
    $directory=rtrim(sys_get_temp_dir(),'/\\').'/sigma-quiz-jobs-'.substr(hash('sha256',$identity.':sigma-elms'),0,16);
    if(!is_dir($directory)&&!mkdir($directory,0700,true)&&!is_dir($directory))throw new RuntimeException('Generation storage is unavailable.');
    return $directory;
}
function quizAiJobPath(string $id): string {
    if(!preg_match('/^[a-f0-9]{32}$/D',$id))throw new InvalidArgumentException('Invalid generation identifier.');
    return quizAiJobDirectory().'/'.$id.'.json';
}
function quizAiWriteJob(string $id,array $job): void {
    $path=quizAiJobPath($id);$temporary=$path.'.'.bin2hex(random_bytes(4)).'.tmp';
    if(file_put_contents($temporary,json_encode($job,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),LOCK_EX)===false)throw new RuntimeException('Generation status could not be saved.');
    chmod($temporary,0600);rename($temporary,$path);
}
function quizAiReadJob(string $id,string $owner): array {
    $path=quizAiJobPath($id);if(!is_file($path))throw new InvalidArgumentException('Generation was not found.');
    $job=json_decode(file_get_contents($path),true,64,JSON_THROW_ON_ERROR);
    if(!hash_equals((string)($job['ownerId']??''),$owner))throw new InvalidArgumentException('Generation was not found.');
    if(time()-(int)($job['createdAt']??0)>600&&in_array($job['status'],['pending','running'],true))return ['status'=>'failed','error'=>'Generation took too long. Try again.'];
    return array_intersect_key($job,array_flip(['status','result','error']));
}
function quizAiStartJob(array $input,array $actor): string {
    // Validate before reserving a worker. No credentials or browser token is stored in a job.
    $count=filter_var($input['count']??null,FILTER_VALIDATE_INT);$type=$input['type']??'Mixed';
    if(!$count||$count<1||$count>100||!is_string($input['source']??null)||!trim($input['source'])||strlen($input['source'])>60000)throw new InvalidArgumentException('Choose readable material and 1–100 questions.');
    if(!in_array($type,['Mixed','Multiple Choice','True or False','Short Answer','Essay','Matching Type','Enumeration'],true))throw new InvalidArgumentException('Unsupported question type.');
    quizAiBlueprint($input,$count,$type);
    $directory=quizAiJobDirectory();
    // One active provider request per author; a double click or retry cannot create duplicate jobs.
    $lock=fopen($directory.'/owner-'.hash('sha256',(string)$actor['id']).'.lock','c+');if(!$lock||!flock($lock,LOCK_EX))throw new RuntimeException('Generation is busy. Try again.');
    try{
        foreach(glob($directory.'/*.json')?:[] as $path){
            $job=json_decode(file_get_contents($path),true);$age=time()-(int)($job['createdAt']??0);
            if($age>86400){unlink($path);continue;}
            if(($job['ownerId']??'')===(string)$actor['id']&&$age<600&&in_array($job['status']??'',['pending','running'],true)){
                if(($job['input']??null)===$input)return basename($path,'.json');
                throw new RuntimeException('Your previous generation is still running. Wait for it to finish before changing the request.');
            }
        }
        if(!function_exists('exec'))throw new RuntimeException('Background generation is unavailable on this server.');
        $id=bin2hex(random_bytes(16));quizAiWriteJob($id,['ownerId'=>(string)$actor['id'],'createdAt'=>time(),'status'=>'pending','input'=>$input]);
        $cli=PHP_BINARY;if(str_contains(strtolower(basename($cli)),'cgi')||str_contains(strtolower(basename($cli)),'fpm'))$cli=dirname($cli).'/php';
        if(!is_executable($cli))throw new RuntimeException('The generation worker is unavailable.');
        $worker=dirname(__DIR__).'/workers/quiz_ai_worker.php';
        $command=escapeshellarg($cli).' '.escapeshellarg($worker).' '.escapeshellarg($id).' > /dev/null 2>&1 < /dev/null &';
        exec($command,$ignored,$status);if($status!==0)throw new RuntimeException('The generation worker could not start.');
        return $id;
    }finally{flock($lock,LOCK_UN);fclose($lock);}
}
function quizAiProviderRequest(string $url,array $headers,array $body): array {
    $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($body),CURLOPT_HTTPHEADER=>array_merge(['Content-Type: application/json'],$headers),CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>45,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_FOLLOWLOCATION=>false]);
    $raw=curl_exec($ch);$code=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    if($raw===false||$code<200||$code>=300)throw new RuntimeException($code===429?'AI quota reached. Wait and try again.':'AI provider request failed. Check the saved key and model.');
    return json_decode($raw,true)?:[];
}
