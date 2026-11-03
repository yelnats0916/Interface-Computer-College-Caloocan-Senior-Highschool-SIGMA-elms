<?php
/** Called only after a learning item has passed role/enrollment/release checks. */
function sigmaLearningFileReference(array $data): string {
    foreach (['fileUrl','url','sourceUrl','downloadUrl'] as $field) {
        if (is_string($data[$field]??null) && trim($data[$field])!=='') return trim($data[$field]);
    }
    $id=$data['google_drive']['file_id']??$data['driveFileId']??'';
    return is_string($id)&&preg_match('/^[a-zA-Z0-9_-]{10,200}$/D',$id)?'https://drive.google.com/file/d/'.$id.'/view':'';
}
function sigmaLearningDownload(string $url,string $token,int $timeout=10): ?string {
    $bytes='';$ch=curl_init($url);
    curl_setopt_array($ch,[CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token],CURLOPT_FOLLOWLOCATION=>false,
        CURLOPT_CONNECTTIMEOUT=>min(5,$timeout),CURLOPT_TIMEOUT=>$timeout,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
        CURLOPT_WRITEFUNCTION=>function($ch,$chunk)use(&$bytes){if(strlen($bytes)+strlen($chunk)>12*1024*1024)return 0;$bytes.=$chunk;return strlen($chunk);}]);
    $ok=curl_exec($ch);$code=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    return $ok!==false&&$code===200?$bytes:null;
}
function sigmaLearningFileText(array $data,bool $allowAssessment=false,bool $fast=false): string {
    $reference=sigmaLearningFileReference($data);if(!$reference)return '';
    $name=(string)($data['fileName']??$data['name']??'');
    $kind=strtolower(pathinfo(parse_url($reference,PHP_URL_PATH)?:$name,PATHINFO_EXTENSION));
    if(!$kind)$kind=strtolower(pathinfo($name,PATHINFO_EXTENSION));
    $path=null;$temporary=false;
    $parts=parse_url($reference);$host=strtolower($parts['host']??'');
    if(str_starts_with($reference,'data:')){
        // Teacher rubrics are stored with the authorized release, not the shared material.
        if(!$allowAssessment||strlen($reference)>8*1024*1024||!preg_match('~^data:([a-zA-Z0-9.+/-]*);base64,([a-zA-Z0-9+/=\r\n]+)$~D',$reference,$inline))return '';
        $kind=strtolower(pathinfo($name,PATHINFO_EXTENSION));
        if(!in_array($kind,['pdf','docx','txt','csv'],true))return '';
        $raw=base64_decode($inline[2],true);
        if($raw===false||strlen($raw)>5*1024*1024)return '';
        $path=tempnam(sys_get_temp_dir(),'sigma-rubric-');
        if($path===false)return '';
        file_put_contents($path,$raw);$temporary=true;
    }elseif(in_array($host,['drive.google.com','docs.google.com'],true)){
        $id='';if(preg_match('~/(?:file|document|presentation)/d/([a-zA-Z0-9_-]{10,200})(?:/|$)~',$parts['path']??'',$m))$id=$m[1];
        parse_str($parts['query']??'',$query);if(!$id&&preg_match('/^[a-zA-Z0-9_-]{10,200}$/D',$query['id']??''))$id=$query['id'];
        if(!$id)return '';
        require_once __DIR__.'/gdrive_service.php';$token=getGdriveAccessToken('');if(!$token)return '';
        $downloadTimeout=$fast?3:10;
        $raw=sigmaLearningDownload('https://www.googleapis.com/drive/v3/files/'.rawurlencode($id).'?fields=mimeType,name,trashed&supportsAllDrives=true',$token,$downloadTimeout);
        $meta=$raw?json_decode($raw,true):null;if(!$meta||!empty($meta['trashed']))return '';
        if(!$allowAssessment&&function_exists('sigmaChatAssessment')&&sigmaChatAssessment(['fileName'=>$meta['name']??'']))return '';
        $kind=strtolower(pathinfo($meta['name']??'',PATHINFO_EXTENSION));
        $googleDoc=in_array($meta['mimeType']??'',['application/vnd.google-apps.document','application/vnd.google-apps.presentation'],true);
        if($googleDoc)$kind='txt';
        if(!in_array($kind,['pdf','docx','pptx','odt','txt','csv','md'],true))return '';
        $raw=sigmaLearningDownload('https://www.googleapis.com/drive/v3/files/'.rawurlencode($id).($googleDoc?'/export?mimeType=text%2Fplain':'?alt=media&supportsAllDrives=true'),$token,$downloadTimeout);
        if($raw===null)return '';
        $path=tempnam(sys_get_temp_dir(),'sigma-learning-');file_put_contents($path,$raw);$temporary=true;
    }else{
        // Never fetch arbitrary URLs or accept a browser-supplied file path.
        if($host!==''&&!in_array($host,['sigma-elms.alwaysdata.net','localhost','127.0.0.1'],true))return '';
        $relative=rawurldecode($parts['path']??'');
        $relative=preg_replace('~^/sigma-elms/~','/',$relative);
        if(!preg_match('~^/?(?:uploads/(?:documents|materials|files)|image)/[a-zA-Z0-9_. -]+$~D',$relative))return '';
        $root=realpath(dirname(__DIR__,2));$path=realpath($root.'/'.ltrim($relative,'/'));
        // Uploads may be a shared symlink, but only the resolved named upload directory is permitted.
        $allowed=realpath($root.'/'.dirname(ltrim($relative,'/')));
        if(!$path||!$allowed||!str_starts_with($path,$allowed.DIRECTORY_SEPARATOR)||!is_file($path))return '';
    }
    try{
        if(!in_array($kind,['pdf','docx','pptx','odt','txt','csv','md'],true)||filesize($path)>12*1024*1024)return '';
        $python=PHP_OS_FAMILY==='Windows'?'python':'/usr/bin/python3';
        $process=proc_open([$python,'-c',require __DIR__.'/sigma_learning_reader.php',$path,$kind,$fast?'fast':'normal'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
        if(!is_resource($process))return '';
        fclose($pipes[0]);
        if($fast){
            stream_set_blocking($pipes[1],false);stream_set_blocking($pipes[2],false);$out='';$deadline=microtime(true)+7;$status=null;
            do{$out.=stream_get_contents($pipes[1],400000-strlen($out));stream_get_contents($pipes[2],4000);$status=proc_get_status($process);if(!$status['running'])break;usleep(50000);}while(microtime(true)<$deadline);
            if($status&&$status['running']){proc_terminate($process);fclose($pipes[1]);fclose($pipes[2]);proc_close($process);return '';}
            $out.=stream_get_contents($pipes[1],400000-strlen($out));fclose($pipes[1]);fclose($pipes[2]);$code=(int)($status['exitcode']??-1);proc_close($process);
        }else{$out=stream_get_contents($pipes[1],400000);fclose($pipes[1]);fclose($pipes[2]);$code=proc_close($process);}
        $value=json_decode($out,true);return $code===0&&is_string($value['text']??null)?mb_substr($value['text'],0,60000):'';
    }finally{if($temporary&&is_file($path))unlink($path);}
}
