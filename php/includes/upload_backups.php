<?php
// Encrypted uploaded-file archives, outside the public root. Originals are never modified.
require_once __DIR__.'/database_backups.php';
function sigmaUploadBackupDirectory(): string {
    $dir=sigmaBackupDirectory().'/uploaded-files';
    if(!is_dir($dir)&&!mkdir($dir,0700,true))throw new RuntimeException('Uploaded-file backup storage is unavailable.');
    return $dir;
}
function sigmaUploadBackupPassword(): string {return bin2hex(hash_hkdf('sha256',sigmaBackupKey(true),32,'sigma-upload-backups-v1'));}
function sigmaUploadBackupName(string $name): string {
    $name=preg_replace('/[\x00-\x1f\x7f\/\\\\:]+/u','_', $name);
    return trim($name,'. ')?:'uploaded-file';
}
function sigmaUploadBackupLocalInventory(string $web): array {
    $files=[];
    foreach(['uploads','php/image/generated-profiles'] as $relative){
        $root=realpath($web.'/'.$relative);if(!$root||!is_dir($root))continue;
        $iterator=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS));
        foreach($iterator as $item){
            if($item->isLink())throw new RuntimeException('A symbolic link inside uploaded storage cannot be backed up safely.');
            if(!$item->isFile())continue;
            $path=$item->getRealPath();if(!$path||!str_starts_with($path,$root.DIRECTORY_SEPARATOR))throw new RuntimeException('An uploaded file is outside the expected storage folder.');
            $suffix=str_replace(DIRECTORY_SEPARATOR,'/',substr($path,strlen($root)+1));
            $files[]=['source'=>'server','path'=>$path,'name'=>'Server/'.$relative.'/'.$suffix,'bytes'=>$item->getSize(),'sha256'=>hash_file('sha256',$path)];
        }
    }
    return $files;
}
function sigmaUploadBackupDriveRequest(string $token,array $query): array {
    $ch=curl_init('https://www.googleapis.com/drive/v3/files?'.http_build_query($query));
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token],CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>45]);
    $raw=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    if($status!==200)throw new RuntimeException('Google Drive files could not be listed. Check the connected account and folder access.');
    return json_decode($raw,true,32,JSON_THROW_ON_ERROR);
}
function sigmaUploadBackupDriveInventory(string $token,string $root,?callable $progress=null): array {
    if(!preg_match('/^[A-Za-z0-9_-]+$/D',$root))throw new RuntimeException('The Google Drive storage folder is invalid.');
    $queue=[[$root,'Google Drive']];$seen=[];$files=[];
    while($queue){
        [$folder,$prefix]=array_shift($queue);if(isset($seen[$folder]))continue;$seen[$folder]=true;
        if($progress)$progress('Checking uploaded files in Google Drive.');
        if(count($seen)>10000)throw new RuntimeException('There are too many Google Drive folders for this backup.');
        $page='';do{
            $query=['q'=>"'".$folder."' in parents and trashed = false",'pageSize'=>1000,'fields'=>'nextPageToken,incompleteSearch,files(id,name,mimeType,size,md5Checksum,modifiedTime)','supportsAllDrives'=>'true','includeItemsFromAllDrives'=>'true'];if($page)$query['pageToken']=$page;
            $result=sigmaUploadBackupDriveRequest($token,$query);if(!empty($result['incompleteSearch']))throw new RuntimeException('Google Drive returned an incomplete file list. Retry the backup.');
            foreach($result['files']??[] as $file){
                $name=$prefix.'/'.sigmaUploadBackupName($file['name']).' ['.$file['id'].']';
                if($file['mimeType']==='application/vnd.google-apps.folder'){$queue[]=[$file['id'],$name];continue;}
                $native=str_starts_with($file['mimeType'],'application/vnd.google-apps.');
                if($native&&!in_array($file['mimeType'],['application/vnd.google-apps.document','application/vnd.google-apps.spreadsheet','application/vnd.google-apps.presentation','application/vnd.google-apps.drawing'],true))throw new RuntimeException('The Google Drive folder contains an unsupported native file or shortcut. It was not silently omitted.');
                $files[]=['source'=>'drive','id'=>$file['id'],'name'=>$name.($native?'.pdf':''),'bytes'=>(int)($file['size']??0),'md5'=>$file['md5Checksum']??null,'modified'=>$file['modifiedTime']??null,'export'=>$native];
                if(count($files)>10000)throw new RuntimeException('There are too many uploaded files for this backup.');
            }
            $page=$result['nextPageToken']??'';
        }while($page);
    }
    return $files;
}
function sigmaUploadBackupDownload(string $token,array $file,string $destination,int $remaining): void {
    $url='https://www.googleapis.com/drive/v3/files/'.rawurlencode($file['id']).(!empty($file['export'])?'/export?mimeType=application%2Fpdf':'?alt=media&supportsAllDrives=true');
    $out=fopen($destination,'xb');if(!$out)throw new RuntimeException('Uploaded-file staging storage is unavailable.');chmod($destination,0600);$written=0;
    $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token],CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>180,CURLOPT_WRITEFUNCTION=>static function($ch,$chunk)use($out,&$written,$remaining){$written+=strlen($chunk);if($written>$remaining)return 0;return fwrite($out,$chunk);}]);
    $ok=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);fclose($out);
    if($ok===false||$status!==200)throw new RuntimeException('An uploaded Google Drive file could not be copied, or the 256 MB backup limit was reached. No complete file backup was published.');
    if(!empty($file['md5'])&&!hash_equals($file['md5'],hash_file('md5',$destination)))throw new RuntimeException('A Google Drive file changed during backup. Please retry.');
}
function sigmaUploadBackupArchive(string $fingerprint): string {
    if(!preg_match('/^[a-f0-9]{64}$/D',$fingerprint))throw new RuntimeException('Invalid uploaded-file archive identifier.');
    return sigmaUploadBackupDirectory().'/'.$fingerprint.'.zip';
}
function sigmaReadUploadBackup(string $id): array {
    $id=sigmaBackupId($id);$path=sigmaBackupDirectory().'/'.$id.'.uploads.json';
    if(!is_file($path))throw new RuntimeException('This backup has no uploaded-file copy. Create a new backup to include uploads.');
    $manifest=json_decode(file_get_contents($path),true,32,JSON_THROW_ON_ERROR);
    $archive=sigmaUploadBackupArchive($manifest['archive']??'');
    if(!is_file($archive)||!hash_equals($manifest['sha256']??'',hash_file('sha256',$archive)))throw new RuntimeException('Uploaded-file backup integrity check failed.');
    return $manifest;
}
function sigmaCreateUploadBackup(string $id,string $web,?array $fixture=null,?callable $progress=null): array {
    if($fixture!==null&&PHP_SAPI!=='cli')throw new RuntimeException('Fixture uploads are not allowed.');
    if(!class_exists('ZipArchive')||!ZipArchive::isEncryptionMethodSupported(ZipArchive::EM_AES_256))throw new RuntimeException('Encrypted uploaded-file archives are unavailable on this server.');
    $id=sigmaBackupId($id);$token='';$files=sigmaUploadBackupLocalInventory($web);
    if($fixture===null){
        require_once __DIR__.'/service_secrets.php';require_once __DIR__.'/gdrive_service.php';$config=loadServiceSettings()['google_drive']??[];
        if(!empty($config['folder_id'])){$token=getGdriveAccessToken('');if(!$token)throw new RuntimeException('Connect Google Drive before creating a complete uploaded-file backup.');$files=array_merge($files,sigmaUploadBackupDriveInventory($token,(string)$config['folder_id'],$progress));}
    }else{$files=array_merge($files,$fixture);}
    usort($files,fn($a,$b)=>strcmp($a['name'],$b['name']));$knownBytes=array_sum(array_column($files,'bytes'));
    if(count($files)>10000||$knownBytes>268435456)throw new RuntimeException('Uploaded files exceed the current 256 MB archive limit. Increase backup storage capacity before retrying.');
    $identity=array_map(function($file){unset($file['path']);return $file;},$files);
    $fingerprint=hash('sha256',json_encode($identity,JSON_THROW_ON_ERROR));$archive=sigmaUploadBackupArchive($fingerprint);$catalog=$archive.'.json';
    if(is_file($archive)&&is_file($catalog)){
        $meta=json_decode(file_get_contents($catalog),true,32,JSON_THROW_ON_ERROR);
        if(!hash_equals($meta['sha256'],hash_file('sha256',$archive)))throw new RuntimeException('An existing uploaded-file archive failed its integrity check.');
    }else{
        $stored=array_sum(array_map('filesize',glob(sigmaUploadBackupDirectory().'/*.zip')));
        if($stored+$knownBytes>536870912||disk_free_space(sigmaUploadBackupDirectory())<max(67108864,3*$knownBytes))throw new RuntimeException('Uploaded-file backup storage is full. Preserve existing backups and free space before retrying.');
        $staging=sigmaUploadBackupDirectory().'/staging-'.bin2hex(random_bytes(12));mkdir($staging,0700);$zip=new ZipArchive();$tmp=$archive.'.tmp';$opened=false;
        try{
            if($zip->open($tmp,ZipArchive::CREATE|ZipArchive::OVERWRITE)!==true)throw new RuntimeException('Uploaded-file archive could not be created.');$opened=true;$password=sigmaUploadBackupPassword();$bytes=0;$entries=[];
            foreach($files as $index=>$file){
                if($progress)$progress('Copying uploaded file '.($index+1).' of '.count($files).'.');
                $path=$staging.'/'.$index;
                if($file['source']==='server'){if(!copy($file['path'],$path)||!hash_equals($file['sha256'],hash_file('sha256',$path)))throw new RuntimeException('A server upload changed during backup. Please retry.');chmod($path,0600);}
                else{sigmaUploadBackupDownload($token,$file,$path,268435456-$bytes);}
                $bytes+=filesize($path);if($bytes>268435456||$stored+$bytes>536870912)throw new RuntimeException('Uploaded files exceed the current backup storage limit.');
                if(!$zip->addFile($path,$file['name'])||!$zip->setEncryptionName($file['name'],ZipArchive::EM_AES_256,$password))throw new RuntimeException('Uploaded-file encryption failed.');
                $entries[]=['name'=>$file['name'],'bytes'=>filesize($path),'sha256'=>hash_file('sha256',$path)];
            }
            $zip->addFromString('SIGMA-FILES.json',json_encode(['createdAt'=>gmdate('c'),'files'=>$entries],JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR));$zip->setEncryptionName('SIGMA-FILES.json',ZipArchive::EM_AES_256,$password);
            if(!$zip->close())throw new RuntimeException('Uploaded-file archive could not be finished.');$opened=false;chmod($tmp,0600);
            $verify=new ZipArchive();if($verify->open($tmp)!==true)throw new RuntimeException('Uploaded-file archive could not be verified.');$verify->setPassword($password);
            try{foreach($entries as $entry){$stream=$verify->getStream($entry['name']);if(!$stream)throw new RuntimeException('Uploaded-file archive decryption failed.');$hash=hash_init('sha256');hash_update_stream($hash,$stream);fclose($stream);if(!hash_equals($entry['sha256'],hash_final($hash)))throw new RuntimeException('Uploaded-file archive verification failed.');}}finally{$verify->close();}
            if(!rename($tmp,$archive))throw new RuntimeException('Uploaded-file archive could not be saved.');
            $meta=['archive'=>$fingerprint,'sha256'=>hash_file('sha256',$archive),'files'=>count($entries),'originalBytes'=>$bytes,'archiveBytes'=>filesize($archive),'createdAt'=>gmdate('c')];sigmaBackupJsonWrite($catalog,$meta);
        }finally{
            if($opened)$zip->close();if(is_file($tmp))unlink($tmp);foreach(glob($staging.'/*') as $item)unlink($item);rmdir($staging);
        }
    }
    sigmaBackupJsonWrite(sigmaBackupDirectory().'/'.$id.'.uploads.json',$meta+['backupId'=>$id]);return $meta;
}
// Build a normal ZIP for the verified Master Admin. Decrypted staging files never enter the public root.
function sigmaExportUploadBackup(string $id): string {
    $manifest=sigmaReadUploadBackup($id);$source=new ZipArchive();if($source->open(sigmaUploadBackupArchive($manifest['archive']))!==true)throw new RuntimeException('Uploaded-file archive could not be opened.');$source->setPassword(sigmaUploadBackupPassword());
    if(disk_free_space(sigmaUploadBackupDirectory())<max(67108864,3*$manifest['originalBytes'])){$source->close();throw new RuntimeException('Not enough temporary space to download the uploaded-file backup.');}
    $stage=sigmaUploadBackupDirectory().'/export-'.bin2hex(random_bytes(12));mkdir($stage,0700);$path=$stage.'/Uploaded-Files.zip';$target=new ZipArchive();
    try{
        if($target->open($path,ZipArchive::CREATE|ZipArchive::OVERWRITE)!==true)throw new RuntimeException('Uploaded-file download could not be prepared.');
        for($i=0;$i<$source->numFiles;$i++){
            $name=$source->getNameIndex($i);if(!$name||in_array('..',explode('/',$name),true)||str_starts_with($name,'/')||str_contains($name,'\\'))throw new RuntimeException('Invalid backup file path.');
            $input=$source->getStream($name);$temporary=$stage.'/'.$i;if(!$input)throw new RuntimeException('Uploaded-file backup could not be decrypted.');$output=fopen($temporary,'xb');chmod($temporary,0600);stream_copy_to_stream($input,$output);fclose($input);fclose($output);$target->addFile($temporary,$name);
        }
        if(!$target->close())throw new RuntimeException('Uploaded-file download could not be completed.');$source->close();chmod($path,0600);
        foreach(glob($stage.'/*') as $item)if($item!==$path)unlink($item);return $path;
    }catch(Throwable $error){$source->close();@$target->close();foreach(glob($stage.'/*') as $item)unlink($item);rmdir($stage);throw $error;}
}
function sigmaPruneUploadBackupArchives(): void {
    $used=[];foreach(glob(sigmaBackupDirectory().'/*.uploads.json') as $path){$data=json_decode(file_get_contents($path),true);if(isset($data['archive']))$used[$data['archive']]=true;}
    foreach(glob(sigmaUploadBackupDirectory().'/*.zip') as $path)if(!isset($used[pathinfo($path,PATHINFO_FILENAME)])){unlink($path);if(is_file($path.'.json'))unlink($path.'.json');}
}
