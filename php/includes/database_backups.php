<?php
// Database snapshots only. No SQL or arbitrary file paths are accepted from the UI.
function sigmaBackupDirectory(): string {
    $home=getenv('HOME') ?: (getenv('LOCALAPPDATA') ?: sys_get_temp_dir());
    $dir=getenv('SIGMA_BACKUP_DIR') ?: $home.'/sigma-private/database-backups';
    if(!is_dir($dir) && !mkdir($dir,0700,true) && !is_dir($dir))throw new RuntimeException('Backup storage is unavailable.');
    $real=realpath($dir);$web=realpath(dirname(__DIR__,2));
    if(!$real || ($web && ($real===$web || str_starts_with($real,$web.DIRECTORY_SEPARATOR))))throw new RuntimeException('Backups must be stored outside the public website.');
    chmod($real,0700);return $real;
}
function sigmaBackupJsonWrite(string $path,array $data): void {
    $tmp=$path.'.'.bin2hex(random_bytes(4)).'.tmp';
    if(file_put_contents($tmp,json_encode($data,JSON_THROW_ON_ERROR),LOCK_EX)===false)throw new RuntimeException('Backup status could not be saved.');
    chmod($tmp,0600);if(!rename($tmp,$path))throw new RuntimeException('Backup status could not be saved.');
}
function sigmaBackupId(string $id): string {
    if(!preg_match('/^[a-f0-9]{32}$/D',$id))throw new InvalidArgumentException('Invalid backup identifier.');return $id;
}
function sigmaBackupKey(bool $create=false): string {
    $dir=sigmaBackupDirectory();$path=$dir.'/encryption.key';
    if(!is_file($path) && $create){
        if(glob($dir.'/*.sigmabackup'))throw new RuntimeException('Restore the existing backup encryption key before making another backup.');
        $handle=fopen($path,'x');if($handle){chmod($path,0600);fwrite($handle,random_bytes(32));fclose($handle);}
    }
    $key=is_file($path)?file_get_contents($path):'';
    if(strlen($key)!==32)throw new RuntimeException('The backup encryption key is unavailable.');return $key;
}
function sigmaBackupSchema(PDO $db,?array $selection=null): array {
    if($selection!==null && PHP_SAPI!=='cli')throw new RuntimeException('Partial backups are not available from the website.');
    $rows=$db->query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")->fetchAll(PDO::FETCH_ASSOC);$tables=[];
    foreach($rows as $row){
        $name=$row['TABLE_NAME'];if($selection!==null && !in_array($name,$selection,true))continue;
        if(!preg_match('/^[a-zA-Z0-9_]+$/D',$name) || $row['ENGINE']!=='InnoDB')throw new RuntimeException('Every backed-up table must use transactional InnoDB storage.');
        $create=$db->query('SHOW CREATE TABLE `'.$name.'`')->fetch(PDO::FETCH_NUM)[1];
        $columns=[];foreach($db->query('SHOW FULL COLUMNS FROM `'.$name.'`')->fetchAll(PDO::FETCH_ASSOC) as $column)if(!str_contains($column['Extra'],'GENERATED'))$columns[]=$column['Field'];
        $tables[$name]=['schema'=>hash('sha256',preg_replace('/AUTO_INCREMENT=\d+\s*/','',$create)),'create'=>$create,'columns'=>$columns];
    }
    if(!$tables || ($selection!==null && count($tables)!==count($selection)))throw new RuntimeException('The requested database tables are unavailable.');
    return $tables;
}
function sigmaCreateDatabaseBackup(PDO $db,string $actor,string $kind='manual',?array $selection=null): array {
    $id=bin2hex(random_bytes(16));$dir=sigmaBackupDirectory();$schema=sigmaBackupSchema($db,$selection);$key=sigmaBackupKey(true);
    $snapshot=['version'=>1,'id'=>$id,'createdAt'=>gmdate('c'),'database'=>$db->query('SELECT DATABASE()')->fetchColumn(),'scope'=>$selection===null?'full':'test','tables'=>[]];$bytes=0;$count=0;
    $db->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');$db->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    try{
        foreach($schema as $table=>$definition){
            $rows=[];$query=$db->query('SELECT `'.implode('`,`',$definition['columns']).'` FROM `'.$table.'`');
            while($row=$query->fetch(PDO::FETCH_NUM)){
                $encoded=array_map(fn($value)=>$value===null?null:base64_encode((string)$value),$row);
                $bytes+=strlen(json_encode($encoded,JSON_THROW_ON_ERROR));if($bytes>33554432)throw new RuntimeException('The database exceeds this installation\'s 32 MB logical backup limit. Use the hosting backup service.');
                $rows[]=$encoded;$count++;
            }
            $snapshot['tables'][$table]=$definition+['rows'=>$rows];
        }
        if(array_map(fn($v)=>$v['schema'],sigmaBackupSchema($db,$selection))!==array_map(fn($v)=>$v['schema'],$schema))throw new RuntimeException('The database structure changed during backup. Please retry.');
        $db->commit();
    }catch(Throwable $error){if($db->inTransaction())$db->rollBack();throw $error;}
    $plain=gzencode(json_encode($snapshot,JSON_THROW_ON_ERROR),6);$nonce=random_bytes(12);
    $cipher=openssl_encrypt($plain,'aes-256-gcm',$key,OPENSSL_RAW_DATA,$nonce,$tag,'sigma-database-backup-v1:'.$id);
    if($cipher===false)throw new RuntimeException('Backup encryption failed.');
    $path=$dir.'/'.$id.'.sigmabackup';$tmp=$path.'.tmp';
    if(file_put_contents($tmp,'SIGMABK1'.$nonce.$tag.$cipher,LOCK_EX)===false)throw new RuntimeException('Backup file could not be written.');chmod($tmp,0600);rename($tmp,$path);
    $meta=['id'=>$id,'createdAt'=>$snapshot['createdAt'],'kind'=>$kind,'actorId'=>$actor,'bytes'=>filesize($path),'tables'=>count($schema),'rows'=>$count,'sha256'=>hash_file('sha256',$path),'scope'=>$snapshot['scope'],'verified'=>true];
    sigmaBackupJsonWrite($dir.'/'.$id.'.json',$meta);
    try{sigmaReadDatabaseBackup($id);}catch(Throwable $error){unlink($path);unlink($dir.'/'.$id.'.json');throw $error;}
    return $meta;
}
function sigmaReadDatabaseBackup(string $id): array {
    $id=sigmaBackupId($id);$dir=sigmaBackupDirectory();$path=$dir.'/'.$id.'.sigmabackup';$metaPath=$dir.'/'.$id.'.json';
    if(!is_file($path)||!is_file($metaPath)||filesize($path)>50331648)throw new RuntimeException('The selected backup is unavailable.');
    $meta=json_decode(file_get_contents($metaPath),true,32,JSON_THROW_ON_ERROR);
    if(!hash_equals($meta['sha256'],hash_file('sha256',$path)))throw new RuntimeException('Backup integrity check failed.');
    $data=file_get_contents($path);if(substr($data,0,8)!=='SIGMABK1')throw new RuntimeException('Invalid backup format.');
    $plain=openssl_decrypt(substr($data,36),'aes-256-gcm',sigmaBackupKey(),OPENSSL_RAW_DATA,substr($data,8,12),substr($data,20,16),'sigma-database-backup-v1:'.$id);
    if($plain===false)throw new RuntimeException('Backup authentication failed.');
    $json=gzdecode($plain,67108864);if($json===false)throw new RuntimeException('Backup data could not be read.');
    $snapshot=json_decode($json,true,32,JSON_THROW_ON_ERROR);
    if(($snapshot['version']??0)!==1||($snapshot['id']??'')!==$id||!is_array($snapshot['tables']??null))throw new RuntimeException('Backup format validation failed.');
    return $snapshot;
}
function sigmaValidateDatabaseRestore(PDO $db,array $snapshot,?array $selection=null): array {
    $schema=sigmaBackupSchema($db,$selection);
    if(($snapshot['database']??'')!==$db->query('SELECT DATABASE()')->fetchColumn() || ($snapshot['scope']??'')!==($selection===null?'full':'test') || array_keys($schema)!==array_keys($snapshot['tables']))throw new RuntimeException('This backup does not match the current database.');
    foreach($schema as $table=>$definition){
        $saved=$snapshot['tables'][$table];if($definition['schema']!==($saved['schema']??'') || $definition['columns']!==($saved['columns']??null))throw new RuntimeException('The database structure has changed since this backup. Restore requires the matching application version.');
        foreach($saved['rows'] as $row){if(count($row)!==count($definition['columns']))throw new RuntimeException('Invalid backup row.');foreach($row as $value)if($value!==null && (!is_string($value)||base64_decode($value,true)===false))throw new RuntimeException('Invalid backup value.');}
    }
    return $schema;
}
function sigmaRestoreDatabaseSnapshot(PDO $db,array $snapshot,?array $selection=null,?array $session=null): void {
    $schema=sigmaValidateDatabaseRestore($db,$snapshot,$selection);
    $db->exec('SET FOREIGN_KEY_CHECKS=0');$db->beginTransaction();
    try{
        foreach($schema as $table=>$definition)$db->exec('DELETE FROM `'.$table.'`');
        foreach($snapshot['tables'] as $table=>$saved){
            $query=$db->prepare('INSERT INTO `'.$table.'` (`'.implode('`,`',$saved['columns']).'`) VALUES('.implode(',',array_fill(0,count($saved['columns']),'?')).')');
            foreach($saved['rows'] as $row)$query->execute(array_map(fn($value)=>$value===null?null:base64_decode($value,true),$row));
        }
        // Validate foreign keys explicitly: re-enabling checks alone does not check inserted rows.
        $keys=$db->query("SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME,CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION")->fetchAll(PDO::FETCH_ASSOC);$groups=[];
        foreach($keys as $key)if(isset($schema[$key['TABLE_NAME']]))$groups[$key['TABLE_NAME'].':'.$key['CONSTRAINT_NAME']][]=$key;
        foreach($groups as $parts){$table=$parts[0]['TABLE_NAME'];$parent=$parts[0]['REFERENCED_TABLE_NAME'];$joins=[];$notNull=[];
            foreach($parts as $part){$joins[]='c.`'.$part['COLUMN_NAME'].'`=p.`'.$part['REFERENCED_COLUMN_NAME'].'`';$notNull[]='c.`'.$part['COLUMN_NAME'].'` IS NOT NULL';}
            $sql='SELECT COUNT(*) FROM `'.$table.'` c LEFT JOIN `'.$parent.'` p ON '.implode(' AND ',$joins).' WHERE '.implode(' AND ',$notNull).' AND p.`'.$parts[0]['REFERENCED_COLUMN_NAME'].'` IS NULL';
            if((int)$db->query($sql)->fetchColumn())throw new RuntimeException('Restored records failed a relationship check. No data was changed.');
        }
        if($selection===null){
            foreach(['grade_sync_tokens','service_vault_sessions','application_login_challenges','service_vault_login_attempts','grade_sync_attempts'] as $table)if(isset($schema[$table]))$db->exec('DELETE FROM `'.$table.'`');
            if($session){
                $q=$db->prepare("SELECT role,status,is_deleted,totp_enabled,terms_accepted FROM users WHERE id=?");$q->execute([$session['actor']]);$user=$q->fetch(PDO::FETCH_ASSOC);
                if(!$user||preg_replace('/[\s_-]+/','',strtolower($user['role']))!=='masteradmin'||strtolower($user['status'])!=='active'||$user['is_deleted']||!$user['totp_enabled']||!$user['terms_accepted'])throw new RuntimeException('The selected backup cannot restore access for this Master Admin. No data was changed.');
                $db->prepare('INSERT INTO service_vault_sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE))')->execute([$session['hash'],$session['actor']]);
            }
        }
        $db->commit();
    }catch(Throwable $error){if($db->inTransaction())$db->rollBack();throw $error;}
    finally{$db->exec('SET FOREIGN_KEY_CHECKS=1');}
}
function sigmaBackupHistory(): array {
    $records=[];foreach(glob(sigmaBackupDirectory().'/*.json') as $path){if(!preg_match('/^[a-f0-9]{32}\.json$/D',basename($path)))continue;$m=json_decode(file_get_contents($path),true);if(($m['scope']??'')==='full' && is_file(substr($path,0,-5).'.sigmabackup'))$records[]=$m;}
    usort($records,fn($a,$b)=>strcmp($b['createdAt'],$a['createdAt']));return $records;
}
// Stored outside the database so restoring an older snapshot cannot erase this receipt.
function sigmaBackupLastRestore(): ?array {
    $path=sigmaBackupDirectory().'/last-restore.json';
    if(!is_file($path))return null;
    $receipt=json_decode(file_get_contents($path),true,16,JSON_THROW_ON_ERROR);
    return ['backupId'=>sigmaBackupId($receipt['backupId']),'restoredAt'=>$receipt['restoredAt'],'actorId'=>$receipt['actorId'],'actorName'=>$receipt['actorName']];
}
function sigmaBackupRecordRestore(string $backupId,string $actorId,string $actorName): void {
    sigmaBackupJsonWrite(sigmaBackupDirectory().'/last-restore.json',['backupId'=>sigmaBackupId($backupId),'restoredAt'=>gmdate('c'),'actorId'=>$actorId,'actorName'=>$actorName]);
}
function sigmaBackupSettings(): array {
    $path=sigmaBackupDirectory().'/schedule.json';
    $saved=is_file($path)?json_decode(file_get_contents($path),true,16,JSON_THROW_ON_ERROR):[];
    $settings=['enabled'=>array_key_exists('enabled',$saved)?!empty($saved['enabled']):true,'times'=>sigmaBackupScheduleTimes($saved['times']??['08:00','20:00']),'retention'=>14,'timezone'=>'Asia/Manila'];
    $settings['schedulerReady']=is_file(sigmaBackupDirectory().'/scheduler-configured');
    $settings['active']=$settings['enabled']&&$settings['schedulerReady'];
    $settings['nextScheduledAt']=sigmaBackupNextScheduledAt($settings);
    return $settings;
}
function sigmaBackupNextScheduledAt(array $settings, ?DateTimeImmutable $now = null): ?string {
    if(empty($settings['enabled']) || empty($settings['schedulerReady']))return null;
    $now=($now??new DateTimeImmutable('now'))->setTimezone(new DateTimeZone('Asia/Manila'));
    foreach(sigmaBackupScheduleTimes($settings['times']) as $time){
        [$hour,$minute]=array_map('intval',explode(':',$time));$candidate=$now->setTime($hour,$minute,0);
        if($candidate>$now)return $candidate->format(DateTimeInterface::ATOM);
    }
    [$hour,$minute]=array_map('intval',explode(':',sigmaBackupScheduleTimes($settings['times'])[0]));
    return $now->modify('+1 day')->setTime($hour,$minute,0)->format(DateTimeInterface::ATOM);
}
// One successful snapshot per Manila schedule window; manual copies never satisfy it.
function sigmaBackupScheduleTimes($times): array {
    if(!is_array($times)||count($times)!==2)throw new InvalidArgumentException('Choose two daily backup times.');
    foreach($times as $time)if(!is_string($time)||!preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D',$time))throw new InvalidArgumentException('Enter valid backup times.');
    if($times[0]===$times[1])throw new InvalidArgumentException('Choose two different backup times.');
    sort($times);return array_values($times);
}
function sigmaBackupScheduleDue(DateTimeImmutable $now,array $history,array $settings): bool {
    if(empty($settings['enabled'])||(isset($settings['schedulerReady'])&&!$settings['schedulerReady']))return false;
    $now=$now->setTimezone(new DateTimeZone('Asia/Manila'));$slot=null;
    foreach($settings['times'] as $time)if($now->format('H:i')>=$time){[$hour,$minute]=array_map('intval',explode(':',$time));$slot=$now->setTime($hour,$minute,0);}
    if(!$slot)return false;
    foreach($history as $record)if(($record['kind']??'')==='scheduled' && new DateTimeImmutable($record['createdAt'])>=$slot)return false;
    return true;
}
function sigmaBackupPublicJob(array $job): array {unset($job['sessionHash']);return $job;}
function sigmaBackupLaunch(string $action,string $actor,string $backupId='',string $hash=''): array {
    $dir=sigmaBackupDirectory();$launch=fopen($dir.'/launch.lock','c');if(!flock($launch,LOCK_EX))throw new RuntimeException('Backup service is busy.');
    try{
        foreach(glob($dir.'/job-*.json') as $path){$job=json_decode(file_get_contents($path),true);if(in_array($job['status']??'',['queued','running'],true)&&strtotime($job['updatedAt']??$job['createdAt'])>time()-900)throw new RuntimeException('A backup or restore is already running.');}
        $id=bin2hex(random_bytes(16));$job=['id'=>$id,'action'=>$action,'actor'=>$actor,'backupId'=>$backupId,'sessionHash'=>$hash,'status'=>'queued','createdAt'=>gmdate('c')];
        sigmaBackupJsonWrite($dir.'/job-'.$id.'.json',$job);
        $worker=dirname(__DIR__).'/cli/database-backup-worker.php';
        if(PHP_OS_FAMILY==='Windows')throw new RuntimeException('Configure the backup worker on the hosting server.');
        exec('nohup /usr/bin/php '.escapeshellarg($worker).' '.escapeshellarg($id).' > /dev/null 2>&1 < /dev/null &');
        return sigmaBackupPublicJob($job);
    }finally{flock($launch,LOCK_UN);fclose($launch);}
}
