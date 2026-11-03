<?php
require_once __DIR__.'/material_storage.php';

function sigmaStageSubmissionUpload(PDO $db,array $actor,string $url,string $name): string {
    sigmaEnsureMaterialUploads($db);
    $id=bin2hex(random_bytes(16));
    $db->prepare('INSERT INTO material_uploads(id,actor_id,subject_id,topic_id,material_title,asset_kind,local_url,file_name,folder_path) VALUES(?,?,?,?,?,?,?,?,?)')->execute([
        $id,(string)$actor['id'],'','','Student submission','staged_submission',$url,$name,json_encode(sigmaGeneralUploadFolderPath($actor,'submissions'),JSON_THROW_ON_ERROR)
    ]);
    return $id;
}

// Called in the same transaction as the accepted submission. Cancelled selections
// and rejected submissions never enter the Drive queue.
function sigmaQueueSubmittedUploads(PDO $db,array $actor,array $files,string $subjectId,string $title): int {
    $queued=0;
    $update=$db->prepare("UPDATE material_uploads SET asset_kind='submission',subject_id=?,material_title=? WHERE actor_id=? AND local_url=? AND asset_kind='staged_submission' AND synced_at IS NULL");
    foreach($files as $file){
        $update->execute([$subjectId,mb_substr($title,0,255),(string)$actor['id'],ltrim((string)($file['url']??''),'/')]);
        $queued+=$update->rowCount();
    }
    return $queued;
}

function sigmaStartSubmissionUploadSync(): void {
    if(PHP_OS_FAMILY==='Windows'||!is_callable('exec'))return;
    $worker=dirname(__DIR__).'/workers/submission-upload-sync.php';
    $private='/home/sigma-elms/sigma-private';
    if(!is_file($worker)||!is_dir($private))return;
    // Fixed paths only; no user input is passed to the process launcher.
    @exec('nohup /usr/bin/php '.escapeshellarg($worker).' > '.escapeshellarg($private.'/submission-upload-sync.log').' 2>&1 < /dev/null &');
}
