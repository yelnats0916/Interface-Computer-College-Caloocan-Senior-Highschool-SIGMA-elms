<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__,2).'/config/database.php';
require __DIR__.'/../includes/database_backups.php';
require __DIR__.'/../includes/upload_backups.php';
require __DIR__.'/../includes/activity_audit.php';
$dir=sigmaBackupDirectory();$lock=fopen($dir.'/operation.lock','c');
if(!flock($lock,LOCK_EX|LOCK_NB))exit;
$job=null;$path='';$maintenance=$dir.'/restore-active.json';
try{
    if(($argv[1]??'')==='--scheduled'){
        $settings=sigmaBackupSettings();$now=new DateTimeImmutable('now',new DateTimeZone('Asia/Manila'));
        if(!sigmaBackupScheduleDue($now,sigmaBackupHistory(),$settings))exit;
        $actor=$pdo->query("SELECT id FROM users WHERE LOWER(REPLACE(role,' ',''))='masteradmin' AND LOWER(status)='active' AND is_deleted=0 ORDER BY id LIMIT 1")->fetchColumn();
        if(!$actor)throw new RuntimeException('A scheduled backup requires an active Master Admin.');
        $job=['id'=>bin2hex(random_bytes(16)),'action'=>'scheduled','actor'=>$actor,'backupId'=>'','sessionHash'=>'','status'=>'queued','createdAt'=>gmdate('c')];$path=$dir.'/job-'.$job['id'].'.json';
    }else{
        $id=sigmaBackupId($argv[1]??'');$path=$dir.'/job-'.$id.'.json';
        if(!is_file($path))throw new RuntimeException('Backup operation not found.');
        $job=json_decode(file_get_contents($path),true,32,JSON_THROW_ON_ERROR);
        if($job['status']!=='queued')exit;
        if(!in_array($job['action'],['create','restore'],true))throw new RuntimeException('Invalid backup operation.');
    }
    $job['status']='running';$job['startedAt']=gmdate('c');$job['pid']=getmypid();sigmaBackupJsonWrite($path,$job);
    if($job['action']==='restore'){
        $snapshot=sigmaReadDatabaseBackup($job['backupId']);sigmaValidateDatabaseRestore($pdo,$snapshot);
        sigmaBackupJsonWrite($maintenance,['job'=>$job['id'],'startedAt'=>gmdate('c')]);
        $safety=sigmaCreateDatabaseBackup($pdo,$job['actor'],'before_restore');$job['safetyBackupId']=$safety['id'];sigmaBackupJsonWrite($path,$job);
        $actorQuery=$pdo->prepare('SELECT first_name,last_name,full_name FROM users WHERE id=?');$actorQuery->execute([$job['actor']]);$restoringActor=$actorQuery->fetch(PDO::FETCH_ASSOC);
        $actorName=trim((string)($restoringActor['full_name']??''))?:trim(($restoringActor['first_name']??'').' '.($restoringActor['last_name']??''));
        sigmaRestoreDatabaseSnapshot($pdo,$snapshot,null,['actor'=>$job['actor'],'hash'=>$job['sessionHash']]);
        sigmaBackupRecordRestore($job['backupId'],(string)$job['actor'],$actorName?:'Administrator');
        $job['message']='Database restored successfully. Sign in again to continue.';
        sigmaRecordActivity($pdo,$job['actor'],'Database restored','Backup & Restore','Restored a verified database snapshot. A safety backup was created first.',['backupId'=>$job['backupId'],'safetyBackupId'=>$safety['id']]);
    }else{
        $backup=sigmaCreateDatabaseBackup($pdo,$job['actor'],$job['action']==='scheduled'?'scheduled':'manual');$job['backupId']=$backup['id'];
        $job['message']='Copying and verifying uploaded files from server storage and Google Drive.';sigmaBackupJsonWrite($path,$job);
        try{
            $uploads=sigmaCreateUploadBackup($backup['id'],dirname(__DIR__,2),null,function(string $message)use(&$job,$path){$job['updatedAt']=gmdate('c');$job['message']=$message;sigmaBackupJsonWrite($path,$job);});
            $backup['uploads']=$uploads;sigmaBackupJsonWrite($dir.'/'.$backup['id'].'.json',$backup);
        }catch(Throwable $failure){
            // Never advertise an incomplete new database-and-files backup as successful.
            foreach(['.sigmabackup','.json','.uploads.json'] as $suffix)if(is_file($dir.'/'.$backup['id'].$suffix))unlink($dir.'/'.$backup['id'].$suffix);
            throw $failure;
        }
        $job['message']='Database and '.$uploads['files'].' uploaded files backed up, encrypted and verified.';
        sigmaRecordActivity($pdo,$job['actor'],'Database backup created','Backup & Restore',$job['message'],['backupId'=>$backup['id'],'kind'=>$backup['kind'],'tables'=>$backup['tables']]);
        if($job['action']==='scheduled'){
            $scheduled=array_values(array_filter(sigmaBackupHistory(),fn($m)=>$m['kind']==='scheduled'));
            foreach(array_slice($scheduled,(int)sigmaBackupSettings()['retention']) as $old){unlink($dir.'/'.$old['id'].'.sigmabackup');unlink($dir.'/'.$old['id'].'.json');if(is_file($dir.'/'.$old['id'].'.uploads.json'))unlink($dir.'/'.$old['id'].'.uploads.json');}
            sigmaPruneUploadBackupArchives();
        }
    }
    $job['status']='completed';$job['finishedAt']=gmdate('c');sigmaBackupJsonWrite($path,$job);
}catch(Throwable $error){
    if($pdo && $pdo->inTransaction())$pdo->rollBack();
    if($job && $path){$job['status']='failed';$job['finishedAt']=gmdate('c');$job['message']=$error instanceof PDOException?'The database operation failed. No partial restore was committed.':$error->getMessage();sigmaBackupJsonWrite($path,$job);}
    error_log('SIGMA backup worker failed: '.get_class($error));
}finally{
    if(is_file($maintenance))unlink($maintenance);
    flock($lock,LOCK_UN);fclose($lock);
}
