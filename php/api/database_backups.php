<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
require __DIR__.'/../../config/database.php';require __DIR__.'/../includes/service_vault_auth.php';require __DIR__.'/../includes/application_auth.php';require __DIR__.'/../includes/database_backups.php';require __DIR__.'/../includes/activity_audit.php';
require __DIR__.'/../includes/upload_backups.php';
restrictServiceOrigin();
try{
    $actor=sigmaRequireApplicationActor($pdo,['masteradmin']);requireServiceVaultAccess('backups');
    $method=$_SERVER['REQUEST_METHOD']??'GET';$dir=sigmaBackupDirectory();
    if($method==='GET'){
        $action=$_GET['action']??'list';
        if($action==='job'){
            $id=sigmaBackupId($_GET['id']??'');$path=$dir.'/job-'.$id.'.json';if(!is_file($path))throw new InvalidArgumentException('Backup operation not found.');
            $job=json_decode(file_get_contents($path),true,32,JSON_THROW_ON_ERROR);
            if(in_array($job['status'],['queued','running'],true) && strtotime($job['updatedAt']??$job['createdAt'])<time()-900){$job['status']='failed';$job['message']='The backup worker did not finish. Check server availability before retrying.';sigmaBackupJsonWrite($path,$job);}
            echo json_encode(['success'=>true,'job'=>sigmaBackupPublicJob($job)]);exit;
        }
        if($action==='download_uploads'){
            $id=sigmaBackupId($_GET['id']??'');set_time_limit(300);$file=sigmaExportUploadBackup($id);
            try{
                sigmaRecordActivity($pdo,(string)$actor['id'],'Uploaded-file backup downloaded','Backup & Restore','Downloaded actual uploaded files from the encrypted backup.',['backupId'=>$id]);
                header('Content-Type: application/zip');header('Content-Disposition: attachment; filename="SIGMA-Uploaded-Files-'.$id.'.zip"');header('Content-Length: '.filesize($file));readfile($file);
            }finally{unlink($file);rmdir(dirname($file));}exit;
        }
        if($action==='download'){
            $id=sigmaBackupId($_GET['id']??'');sigmaReadDatabaseBackup($id);
            sigmaRecordActivity($pdo,(string)$actor['id'],'Database backup downloaded','Backup & Restore','Downloaded an encrypted database snapshot.',['backupId'=>$id]);
            header('Content-Type: application/octet-stream');header('Content-Disposition: attachment; filename="SIGMA-Database-'.$id.'.sigmabackup"');header('Content-Length: '.filesize($dir.'/'.$id.'.sigmabackup'));readfile($dir.'/'.$id.'.sigmabackup');exit;
        }
        if($action!=='list')throw new InvalidArgumentException('Unsupported backup request.');
        $jobs=[];$latest=null;$operations=[];
        foreach(glob($dir.'/job-*.json') as $path){
            $j=json_decode(file_get_contents($path),true);
            if(in_array($j['status']??'',['queued','running'],true) && strtotime($j['updatedAt']??$j['createdAt'])<time()-900){$j['status']='failed';$j['message']='The backup worker did not finish. Check server availability before retrying.';sigmaBackupJsonWrite($path,$j);}
            if(!$latest||strcmp($j['createdAt'],$latest['createdAt'])>0)$latest=sigmaBackupPublicJob($j);
            if(in_array($j['status']??'',['queued','running'],true))$jobs[]=sigmaBackupPublicJob($j);
            if(in_array($j['status']??'',['queued','running','failed'],true))$operations[]=sigmaBackupPublicJob($j);
        }
        usort($operations,fn($a,$b)=>strcmp($b['createdAt'],$a['createdAt']));
        echo json_encode(['success'=>true,'backups'=>sigmaBackupHistory(),'lastRestore'=>sigmaBackupLastRestore(),'settings'=>sigmaBackupSettings(),'jobs'=>$jobs,'operations'=>array_slice($operations,0,50),'latestJob'=>$latest,'scope'=>'New backups include database records and uploaded files. Older copies can be database-only.']);exit;
    }
    if($method!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'Unsupported method.']);exit;}
    $raw=file_get_contents('php://input',false,null,0,4097);if(strlen($raw)>4096)throw new InvalidArgumentException('Backup request is too large.');$input=json_decode($raw,true,16,JSON_THROW_ON_ERROR);$action=$input['action']??'';
    if($action==='schedule'){
        if(!is_bool($input['enabled']??null))throw new InvalidArgumentException('Invalid automatic backup setting.');
        $times=sigmaBackupScheduleTimes($input['times']??sigmaBackupSettings()['times']);
        sigmaBackupJsonWrite($dir.'/schedule.json',['enabled'=>$input['enabled'],'times'=>$times,'retention'=>14,'timezone'=>'Asia/Manila']);
        sigmaRecordActivity($pdo,(string)$actor['id'],'Backup schedule updated','Backup & Restore','Saved twice-daily backup schedule: '.implode(' and ',$times).' Asia/Manila. Automatic backups '.($input['enabled']?'enabled'.(sigmaBackupSettings()['schedulerReady']?'.':'; waiting for hosting setup.'):'off.'));echo json_encode(['success'=>true,'settings'=>sigmaBackupSettings()]);exit;
    }
    if(!in_array($action,['create','restore'],true))throw new InvalidArgumentException('Unsupported backup action.');
    $id=$action==='restore'?sigmaBackupId($input['id']??''):'';
    if($action==='restore'){
        if(($input['confirmation']??'')!=='RESTORE')throw new InvalidArgumentException('Type RESTORE to confirm replacing the current database.');
        // The page's existing unexpired password verification covers this action.
        // requireServiceVaultAccess above enforces that server-side session.
        sigmaValidateDatabaseRestore($pdo,sigmaReadDatabaseBackup($id));
    }
    $job=sigmaBackupLaunch($action,(string)$actor['id'],$id,hash('sha256',sigmaApplicationToken()));http_response_code(202);echo json_encode(['success'=>true,'job'=>$job]);
}catch(Throwable $error){http_response_code($error instanceof InvalidArgumentException||$error instanceof JsonException?422:($error instanceof DomainException?403:503));echo json_encode(['success'=>false,'error'=>$error instanceof PDOException?'The backup database is temporarily unavailable.':$error->getMessage()]);}
