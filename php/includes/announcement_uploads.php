<?php
require_once __DIR__.'/material_storage.php';

function sigmaQueueAnnouncementUpload(PDO $db,array $actor,string $url,string $name): string {
    sigmaEnsureMaterialUploads($db);
    $id=bin2hex(random_bytes(16));
    $db->prepare('INSERT INTO material_uploads(id,actor_id,subject_id,topic_id,material_title,asset_kind,local_url,file_name,folder_path) VALUES(?,?,?,?,?,?,?,?,?)')->execute([
        $id,(string)$actor['id'],'','','Announcement attachment','announcement',$url,$name,
        json_encode(sigmaGeneralUploadFolderPath($actor,'announcements'),JSON_THROW_ON_ERROR)
    ]);
    return $id;
}

function sigmaStartAnnouncementUploadSync(): void {
    if(PHP_OS_FAMILY==='Windows'||!is_callable('exec'))return;
    $worker=dirname(__DIR__).'/workers/announcement-upload-sync.php';
    $private='/home/sigma-elms/sigma-private';
    if(!is_file($worker)||!is_dir($private))return;
    @exec('nohup /usr/bin/php '.escapeshellarg($worker).' > '.escapeshellarg($private.'/announcement-upload-sync.log').' 2>&1 < /dev/null &');
}
