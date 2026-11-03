<?php
if(PHP_SAPI!=='cli')exit(1);
require_once dirname(__DIR__).'/includes/service_secrets.php';
require_once dirname(__DIR__).'/includes/material_storage.php';
$lock=fopen('/home/sigma-elms/sigma-private/submission-upload-sync.lock','c');
if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))exit(0);
try {
    $db=serviceSettingsPdo();
    for($i=0;$i<20;$i++){
        $result=sigmaSyncPendingMaterialUploads($db,1,true);
        if($result['error']){fwrite(STDERR,$result['error']."\n");exit(1);}
        if(!$result['pending'])break;
    }
} catch(Throwable $error){fwrite(STDERR,$error->getMessage()."\n");exit(1);}
finally {flock($lock,LOCK_UN);fclose($lock);}
