<?php
// CLI only. Files are authored and visually verified before this installer runs.
if (PHP_SAPI!=='cli') { http_response_code(404);exit; }
$root=$argv[1]??'';$source=$argv[2]??'';$actorId=$argv[3]??'';
if(!is_dir($root) || !is_dir($source) || $actorId==='')throw new RuntimeException('Usage: php installer.php WEB_ROOT VERIFIED_FILES ACTOR_ID');
require $root.'/config/database.php';
require $root.'/php/includes/material_storage.php';
require $root.'/php/includes/material_provenance.php';
require $root.'/php/includes/activity_audit.php';
$find=$pdo->prepare("SELECT * FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)='active'");$find->execute([$actorId]);$actor=$find->fetch(PDO::FETCH_ASSOC);
if(!$actor || !in_array(strtolower($actor['role']),['admin','master admin'],true))throw new RuntimeException('The creator must be an active administrator.');
$tasks=json_decode(file_get_contents($source.'/assessment-manifest.json'),true,512,JSON_THROW_ON_ERROR);
if(count($tasks)!==6)throw new RuntimeException('Expected six verified task and rubric pairs.');
sigmaEnsureMaterialUploads($pdo);
$pdo->beginTransaction();
try {
    $q=$pdo->query("SELECT * FROM subjects WHERE id='CORE-112-RW' AND code='RW-11-12' AND is_deleted=0 FOR UPDATE");$row=$q->fetch(PDO::FETCH_ASSOC);
    if(!$row || $row['status']!=='Draft')throw new RuntimeException('The expected draft Reading and Writing subject was not found.');
    $subject=['topics'=>json_decode($row['topics'],true)?:[], 'materials'=>json_decode($row['materials'],true)?:[]];$previous=$subject;
    $backup=dirname($source).'/reading-writing-before-tasks.json';
    if(!file_exists($backup)){file_put_contents($backup,json_encode($row,JSON_PRETTY_PRINT));chmod($backup,0600);}
    $known=sigmaCollectSubjectMaterials($subject);$added=0;$files=0;
    foreach($tasks as $task) {
        if(isset($known[$task['id']]))continue;
        $topic=null;foreach($subject['topics'] as $t)if($t['id']===$task['topicId']){$topic=$t;break;}
        if(!$topic || $topic['quarter']!==$task['quarter'])throw new RuntimeException('Task topic mismatch.');
        $assets=[];
        foreach(['Instructions'=>'instructions','Rubric'=>'rubric'] as $kind=>$assetKind)foreach(['pdf','docx'] as $ext){
            $fileName=sprintf('RW_Task_%02d_%s.%s',$task['n'],$kind,$ext);$input=$source.'/'.$fileName;
            if(!is_file($input) || filesize($input)<1000)throw new RuntimeException('A required assessment file is missing.');
            $stored=substr(hash_file('sha256',$input),0,16).'_'.$fileName;
            $url='uploads/documents/'.$stored;$destination=$root.'/'.$url;
            if(!is_dir(dirname($destination)))mkdir(dirname($destination),0755,true);
            if(!file_exists($destination) && !copy($input,$destination))throw new RuntimeException('Unable to store an assessment file.');
            if(hash_file('sha256',$input)!==hash_file('sha256',$destination))throw new RuntimeException('Attachment integrity check failed.');
            $receipt=bin2hex(random_bytes(16));$path=sigmaMaterialFolderPath($actor,$row,$topic,$task['title'],$assetKind);
            $pdo->prepare('INSERT INTO material_uploads(id,actor_id,subject_id,topic_id,material_title,asset_kind,local_url,file_name,folder_path,sync_error) VALUES(?,?,?,?,?,?,?,?,?,?)')
                ->execute([$receipt,$actorId,$row['id'],$topic['id'],$task['title'],$assetKind,$url,$fileName,json_encode($path),'Awaiting Google account authorization for Drive file storage.']);
            $assets[$assetKind][$ext]=['url'=>$url,'fileName'=>$fileName,'size'=>filesize($destination),'uploadId'=>$receipt,'google_drive'=>['synced'=>false]];$files++;
        }
        $main=$assets['instructions']['pdf'];$rubric=$assets['rubric']['pdf'];
        $material=['id'=>$task['id'],'title'=>$task['title'],'description'=>$task['goal']."\n\n".$task['submit']."\n\nRead the attached instructions and use the scoring rubric before submitting your work. Total: 100 points.",
            'type'=>'Task','category'=>'Task','topicId'=>$topic['id'],'quarter'=>$topic['quarter'],'status'=>'Draft','sourceType'=>'file',
            'url'=>$main['url'],'fileUrl'=>$main['url'],'fileName'=>$main['fileName'],'fileSize'=>$main['size'],'fileType'=>'pdf','fileUrlStorage'=>$main,
            'hasRubric'=>true,'rubricFileName'=>$rubric['fileName'],'rubricFileSize'=>$rubric['size'],'rubricUrl'=>$rubric['url'],'rubric'=>$rubric['fileName'],
            'rubricUrlStorage'=>$rubric,'rubricSetByAdmin'=>true,'maxScore'=>100,'totalPoints'=>100,
            'attachments'=>[$assets['instructions']['docx'],$assets['rubric']['docx']],
            'competencyCodes'=>$task['codes'],'curriculumSource'=>'https://lrmds.deped.gov.ph/detail/14520'];
        $subject['materials'][]=$material;
        foreach($subject['topics'] as &$target)if($target['id']===$topic['id']){
            foreach(['materials','allMaterials','assignments'] as $collection){if(!isset($target[$collection]))$target[$collection]=[];$target[$collection][]=$material;}
        }unset($target);$added++;
    }
    $created=sigmaStampSubjectMaterials($subject,$previous,$actor);
    $pdo->prepare('UPDATE subjects SET topics=?,materials=? WHERE id=?')->execute([json_encode($subject['topics'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),json_encode($subject['materials'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$row['id']]);
    foreach($created as $material)sigmaRecordActivity($pdo,$actorId,'Created Material','Curriculum',
        'Subject: RW-11-12 Reading and Writing Skills'."\nTitle: ".$material['title']."\nType: Task\nDescription: ".$material['description'],
        ['materialId'=>$material['id'],'subjectId'=>$row['id'],'topicId'=>$material['topicId'],'material'=>$material]);
    $pdo->commit();
    echo json_encode(['subject'=>'RW-11-12','tasksCreated'=>$added,'filesStored'=>$files,'creationLogs'=>count($created),'creator'=>$actor['full_name'],'driveSync'=>'pending authorization','subjectStatus'=>$row['status']])."\n";
}catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
