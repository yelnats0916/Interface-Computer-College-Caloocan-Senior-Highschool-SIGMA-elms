<?php
require_once __DIR__.'/gdrive_service.php';

function sigmaMaterialFolderPath(array $actor, array $subject, array $topic, string $title, string $kind, string $materialType='Task'): array {
    $name = trim((string)($actor['full_name'] ?? $actor['fullName'] ?? ''));
    $segment = static fn($s) => mb_substr(trim(preg_replace('/[\x00-\x1F\/\\\\]+/u', ' ', (string)$s)), 0, 140);
    $type=strtolower(trim($materialType));
    $category=in_array($type,['lesson','video'],true)?'Learning Materials':($type==='quiz'?'Quizzes':'Tasks');
    return [GdriveTemplate::CAMPUS_NAME, 'Master Curriculum', $segment($name).' ('.$segment($actor['id']).')',
        $segment($subject['code'].' '.$subject['name']), GdriveTemplate::formatQuarter($topic['quarter'] ?? 'q1'),
        $segment($topic['title']), $category, $segment($title)];
}

function sigmaGeneralUploadFolderPath(array $actor,string $category): array {
    $categories=['announcements'=>'Announcements','submissions'=>'Student Submissions','quizzes'=>'Quizzes',
        'questions'=>'Quizzes','tasks'=>'Tasks','backups'=>'Backups','faculty'=>'Faculty','teacher'=>'Faculty'];
    $name=$actor['full_name']??$actor['fullName']??'';
    return [GdriveTemplate::CAMPUS_NAME,'Users',sigmaGdriveFolderSegment($name).' ('.sigmaGdriveFolderSegment((string)$actor['id']).')',
        $categories[strtolower($category)]??'Learning Materials'];
}

function sigmaUploadDriveFile(string $token, string $filePath, string $fileName, string $folderId): array {
    if(filesize($filePath)>5*1048576)return sigmaUploadLargeDriveFile($token,$filePath,$fileName,$folderId);
    $boundary = 'sigma'.bin2hex(random_bytes(12));
    $body = '--'.$boundary."\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".
        json_encode(['name'=>$fileName,'parents'=>[$folderId]], JSON_THROW_ON_ERROR).
        "\r\n--".$boundary."\r\nContent-Type: ".(mime_content_type($filePath) ?: 'application/octet-stream')."\r\n\r\n".
        file_get_contents($filePath)."\r\n--".$boundary.'--';
    $ch = curl_init('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,
        CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token,'Content-Type: multipart/related; boundary='.$boundary],
        CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>90]);
    $raw = curl_exec($ch); $status = (int)curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
    $data = json_decode($raw ?: '',true) ?: [];
    if ($status >= 200 && $status < 300 && !empty($data['id'])) return $data;
    $reason = $data['error']['errors'][0]['reason'] ?? 'driveUploadFailed';
    return ['error'=>['code'=>$reason,'message'=>$reason === 'storageQuotaExceeded'
        ? 'Google Drive cannot store files with this service account. Connect a Shared Drive or a Google account with OAuth.'
        : 'Google Drive could not store the file. Check the connection and folder access.']];
}

/** Stream large files to Google so configured video uploads do not exhaust PHP memory. */
function sigmaUploadLargeDriveFile(string $token,string $filePath,string $fileName,string $folderId): array {
    $location='';$mime=mime_content_type($filePath)?:'application/octet-stream';$size=filesize($filePath);
    $ch=curl_init('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink');
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode(['name'=>$fileName,'parents'=>[$folderId]]),
        CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token,'Content-Type: application/json; charset=UTF-8','X-Upload-Content-Type: '.$mime,'X-Upload-Content-Length: '.$size],
        CURLOPT_HEADERFUNCTION=>static function($ch,$line)use(&$location){if(stripos($line,'Location:')===0)$location=trim(substr($line,9));return strlen($line);},
        CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>30]);
    curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    $url=parse_url($location);
    if($status>=200&&$status<300&&($url['scheme']??'')==='https'&&($url['host']??'')==='www.googleapis.com'&&str_starts_with($url['path']??'','/upload/drive/')){
        $stream=fopen($filePath,'rb');if(!$stream)return ['error'=>['message'=>'The stored upload could not be opened.']];
        $ch=curl_init($location);curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_UPLOAD=>true,CURLOPT_INFILE=>$stream,CURLOPT_INFILESIZE=>$size,
            CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token,'Content-Type: '.$mime],CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>210]);
        $raw=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);fclose($stream);$data=json_decode($raw?:'',true)?:[];
        if($status>=200&&$status<300&&!empty($data['id']))return $data;
    }
    return ['error'=>['code'=>'driveUploadFailed','message'=>'The file is saved on the server, but its Google Drive upload did not complete. Check the connection and retry.']];
}

function sigmaEnsureMaterialUploads(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS material_uploads (
        id VARCHAR(64) PRIMARY KEY, actor_id VARCHAR(64) NOT NULL, subject_id VARCHAR(64) NOT NULL,
        topic_id VARCHAR(64) NOT NULL, material_title VARCHAR(255) NOT NULL, asset_kind VARCHAR(20) NOT NULL,
        local_url TEXT NOT NULL, file_name VARCHAR(255) NOT NULL, folder_path LONGTEXT NOT NULL,
        drive_file_id VARCHAR(128) NULL, drive_folder_id VARCHAR(128) NULL, sync_error VARCHAR(255) NULL,
        is_superseded TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, synced_at TIMESTAMP NULL,
        INDEX idx_material_upload_pending (synced_at), INDEX idx_material_upload_actor (actor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $columns=$db->query('SHOW COLUMNS FROM material_uploads')->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('is_superseded',$columns,true)) {
        try { $db->exec('ALTER TABLE material_uploads ADD COLUMN is_superseded TINYINT(1) NOT NULL DEFAULT 0'); }
        catch (PDOException $error) { if (($error->errorInfo[1]??null)!==1060) throw $error; }
    }
}

function sigmaSyncPendingMaterialUploads(PDO $db, int $limit=1): array {
    sigmaEnsureMaterialUploads($db);
    $settings=loadServiceSettings();$config=$settings['google_drive']??[];
    $token=getGdriveAccessToken('');$root=(string)($config['folder_id']??'');
    if (!$token || !$root) throw new RuntimeException('Connect Google Drive and select a storage folder first.');
    $rows=$db->query('SELECT * FROM material_uploads WHERE synced_at IS NULL AND is_superseded=0 ORDER BY created_at,id LIMIT '.max(1,min(1,$limit)))->fetchAll(PDO::FETCH_ASSOC);
    $synced=0;$error=null;
    foreach ($rows as $row) {
        $path=dirname(__DIR__,2).'/'.$row['local_url'];
        if (!preg_match('~^uploads/documents/[A-Za-z0-9_.-]+$~D',$row['local_url']) || !is_file($path)) { $error='A pending attachment is unavailable in server storage.';break; }
        $folder=resolveGdriveFolderPath($token,$root,json_decode($row['folder_path'],true)?:[]);
        if (empty($folder['id'])) { $error='Google Drive could not create the material folder.';break; }
        $file=sigmaUploadDriveFile($token,$path,$row['file_name'],$folder['id']);
        if (empty($file['id'])) { $error=$file['error']['message']??'Google Drive upload failed.';break; }
        $metadata=['folder_id'=>$folder['id'],'folder_url'=>$folder['url'],'file_id'=>$file['id'],
            'view_link'=>$file['webViewLink']??null,'download_link'=>$file['webContentLink']??null,'synced'=>true];
        $db->beginTransaction();
        try {
            $find=$db->prepare('SELECT topics,materials FROM subjects WHERE id=? FOR UPDATE');$find->execute([$row['subject_id']]);$subject=$find->fetch(PDO::FETCH_ASSOC);
            $walk=function(&$node) use (&$walk,$row,$metadata) {
                if (!is_array($node)) return;
                if (($node['uploadId']??null)===$row['id']) $node['google_drive']=$metadata;
                foreach ($node as &$child) if(is_array($child))$walk($child);
            };
            if ($subject) {
                $topics=json_decode($subject['topics'],true)?:[];$materials=json_decode($subject['materials'],true)?:[];
                $walk($topics);$walk($materials);
                $db->prepare('UPDATE subjects SET topics=?,materials=? WHERE id=?')->execute([json_encode($topics),json_encode($materials),$row['subject_id']]);
            }
            $db->prepare('UPDATE material_uploads SET drive_file_id=?,drive_folder_id=?,sync_error=NULL,synced_at=UTC_TIMESTAMP() WHERE id=?')->execute([$file['id'],$folder['id'],$row['id']]);
            require_once __DIR__.'/activity_audit.php';
            sigmaRecordActivity($db,$row['actor_id'],'Uploaded Material File','Curriculum','File: '.$row['file_name']."\nMaterial: ".$row['material_title'],['uploadId'=>$row['id'],'subjectId'=>$row['subject_id']]);
            $db->commit();$synced++;
        } catch(Throwable $failure) { if($db->inTransaction())$db->rollBack();throw $failure; }
    }
    return ['synced'=>$synced,'pending'=>(int)$db->query('SELECT COUNT(*) FROM material_uploads WHERE synced_at IS NULL AND is_superseded=0')->fetchColumn(),'error'=>$error];
}
