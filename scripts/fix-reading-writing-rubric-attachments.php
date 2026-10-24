<?php
// Correct the six authored Reading and Writing tasks; CLI only, with private backup.
if(PHP_SAPI!=='cli')exit;
$root=$argv[1]??'';$expected=json_decode(file_get_contents($argv[2]),true,512,JSON_THROW_ON_ERROR);
require $root.'/config/database.php';require $root.'/php/includes/material_storage.php';require $root.'/php/includes/activity_audit.php';
$private='/home/sigma-elms/sigma-private';$backup=$private.'/rubric-separation-before-v118.json';$journal=$private.'/rubric-separation-journal-v118.json';
$row=$pdo->query("SELECT * FROM subjects WHERE id='CORE-112-RW' AND code='RW-11-12' AND is_deleted=0")->fetch(PDO::FETCH_ASSOC);
if(!$row)throw new RuntimeException('Subject not found.');
if(!file_exists($backup)){file_put_contents($backup,json_encode($row,JSON_THROW_ON_ERROR));chmod($backup,0600);}
$materials=json_decode($row['materials'],true);$tasks=array_values(array_filter($materials,fn($m)=>str_starts_with($m['id']??'','RW-11-12-TASK-')));
if(count($tasks)!==6)throw new RuntimeException('Expected six existing tasks.');
$token=getGdriveAccessToken('');if(!$token)throw new RuntimeException('Google account connection unavailable.');
function driveRequest($url,$method='GET',$body=null,$contentType=null){
 global $token;$headers=['Authorization: Bearer '.$token];if($contentType)$headers[]='Content-Type: '.$contentType;
 $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>60]);if($body!==null)curl_setopt($ch,CURLOPT_POSTFIELDS,$body);
 $raw=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);$data=json_decode($raw?:'',true);
 if($status<200||$status>=300||!is_array($data))throw new RuntimeException('Google Drive request failed (HTTP '.$status.').');return $data;
}
$about=driveRequest('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');
if(strtolower($about['user']['emailAddress']??'')!=='sigma.icc.sh@gmail.com')throw new RuntimeException('Wrong connected Google account.');
$progress=file_exists($journal)?json_decode(file_get_contents($journal),true):[];$updates=[];$receipts=[];
foreach($tasks as $task){
 $n=(int)substr($task['id'],-2);$find=$pdo->prepare('SELECT * FROM material_uploads WHERE subject_id=? AND file_name=?');
 $assets=[];foreach(['Instructions','Rubric'] as $kind){
  $name=sprintf('RW_Task_%02d_%s.pdf',$n,$kind);$find->execute([$row['id'],$name]);$matches=$find->fetchAll(PDO::FETCH_ASSOC);
  // Instruction receipt may already have been renamed during a successful retry.
  $matches=array_values(array_filter($matches,fn($v)=>$v['asset_kind']===strtolower($kind)));
  if(!$matches)throw new RuntimeException('Original attachment receipt missing: '.$name);
  $asset=$matches[0];$path=$root.'/'.$asset['local_url'];
  if(!is_file($path)||hash_file('sha256',$path)!==($expected[$name]??null))throw new RuntimeException('Attachment integrity mismatch: '.$name);
  $asset['path']=$path;$assets[$kind]=$asset;
 }
 $findCurrent=$pdo->prepare('SELECT * FROM material_uploads WHERE id=?');$findCurrent->execute([$task['fileUrlStorage']['uploadId']]);$current=$findCurrent->fetch(PDO::FETCH_ASSOC);
 if(!$current || !$current['drive_file_id'] || !$current['drive_folder_id'])throw new RuntimeException('Current Drive attachment missing.');
 $folder=$current['drive_folder_id'];$instruction=$assets['Instructions'];$rubric=$assets['Rubric'];
 $fileId=$current['drive_file_id'];$fields='id,name,md5Checksum,parents,owners(emailAddress),webViewLink,webContentLink';
 $file=driveRequest('https://www.googleapis.com/drive/v3/files/'.$fileId.'?fields='.urlencode($fields));
 if(($file['md5Checksum']??'')!==md5_file($instruction['path']) || $file['name']!==$instruction['file_name']){
  $boundary='sigma'.bin2hex(random_bytes(12));
  $body='--'.$boundary."\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".json_encode(['name'=>$instruction['file_name']])."\r\n--".$boundary."\r\nContent-Type: application/pdf\r\n\r\n".file_get_contents($instruction['path'])."\r\n--".$boundary.'--';
  driveRequest('https://www.googleapis.com/upload/drive/v3/files/'.$fileId.'?uploadType=multipart&fields=id','PATCH',$body,'multipart/related; boundary='.$boundary);
 }
 $query="'".$folder."' in parents and trashed=false and name='".$rubric['file_name']."'";
 $found=driveRequest('https://www.googleapis.com/drive/v3/files?q='.urlencode($query).'&fields=files(id)&pageSize=100')['files']??[];
 if(count($found)>1)throw new RuntimeException('Duplicate rubric files found; stopped.');
 if($found)$rubricId=$found[0]['id'];else{
  $uploaded=sigmaUploadDriveFile($token,$rubric['path'],$rubric['file_name'],$folder);if(empty($uploaded['id']))throw new RuntimeException('Rubric upload failed.');$rubricId=$uploaded['id'];
 }
 $makeAsset=function($asset,$driveId,$receipt)use($folder,$fields){
  $verified=driveRequest('https://www.googleapis.com/drive/v3/files/'.$driveId.'?fields='.urlencode($fields));
  if(($verified['md5Checksum']??'')!==md5_file($asset['path']) || $verified['name']!==$asset['file_name'] || !in_array($folder,$verified['parents']??[],true) || !in_array('sigma.icc.sh@gmail.com',array_column($verified['owners']??[],'emailAddress'),true))throw new RuntimeException('Drive attachment verification failed.');
  return ['url'=>$asset['local_url'],'fileName'=>$asset['file_name'],'size'=>filesize($asset['path']),'uploadId'=>$receipt,'google_drive'=>['folder_id'=>$folder,'folder_url'=>'https://drive.google.com/drive/folders/'.$folder,'file_id'=>$driveId,'view_link'=>$verified['webViewLink']??'','download_link'=>$verified['webContentLink']??'','synced'=>true]];
 };
 $main=$makeAsset($instruction,$fileId,$current['id']);$score=$makeAsset($rubric,$rubricId,$rubric['id']);
 $updates[$task['id']]=['url'=>$main['url'],'fileUrl'=>$main['url'],'fileName'=>$main['fileName'],'fileSize'=>$main['size'],'fileUrlStorage'=>$main,
 'hasRubric'=>true,'rubricFileName'=>$score['fileName'],'rubricFileSize'=>$score['size'],'rubricUrl'=>$score['url'],'rubric'=>$score['fileName'],'rubricUrlStorage'=>$score,'rubricSetByAdmin'=>true,'rubricIncludedInDocument'=>false,'updatedAt'=>gmdate('c')];
 $receipts[]=['current'=>$current,'instruction'=>$instruction,'rubric'=>$rubric,'rubricId'=>$rubricId];
 $progress[$task['id']]=['instructionsDriveId'=>$fileId,'rubricDriveId'=>$rubricId,'folder'=>$folder,'verified'=>true];file_put_contents($journal,json_encode($progress,JSON_PRETTY_PRINT));chmod($journal,0600);
 echo 'Verified separate files for '.$task['id']."\n";
}
$pdo->beginTransaction();try{
 $locked=$pdo->query("SELECT topics,materials FROM subjects WHERE id='CORE-112-RW' FOR UPDATE")->fetch(PDO::FETCH_ASSOC);
 if($locked['topics']!==$row['topics'] || $locked['materials']!==$row['materials'])throw new RuntimeException('Subject changed during attachment repair. Retry to preserve new edits.');
 $topics=json_decode($locked['topics'],true);$materials=json_decode($locked['materials'],true);$changed=0;
 $walk=function(&$node)use(&$walk,$updates,&$changed){if(!is_array($node))return;if(isset($updates[$node['id']??''])){$node=array_replace($node,$updates[$node['id']]);$changed++;}foreach($node as &$child)if(is_array($child))$walk($child);};
 $walk($topics);$walk($materials);
 $pdo->prepare('UPDATE subjects SET topics=?,materials=? WHERE id=?')->execute([json_encode($topics,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),json_encode($materials,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$row['id']]);
 foreach($receipts as $item){
  $c=$item['current'];$i=$item['instruction'];$r=$item['rubric'];
  $pdo->prepare("UPDATE material_uploads SET asset_kind='instructions',local_url=?,file_name=?,sync_error=NULL,is_superseded=0 WHERE id=?")->execute([$i['local_url'],$i['file_name'],$c['id']]);
  $pdo->prepare('UPDATE material_uploads SET is_superseded=0,folder_path=?,drive_file_id=?,drive_folder_id=?,synced_at=UTC_TIMESTAMP(),sync_error=NULL WHERE id=?')->execute([$c['folder_path'],$item['rubricId'],$c['drive_folder_id'],$r['id']]);
 }
 sigmaRecordActivity($pdo,'0000000','Updated Material','Curriculum','Separated instruction and scoring rubric attachments for six Reading and Writing tasks.',['subjectId'=>$row['id'],'materialIds'=>array_keys($updates)]);
 $pdo->commit();echo json_encode(['tasksFixed'=>count($updates),'materialCopiesUpdated'=>$changed,'separateInstructionPdfs'=>6,'separateRubricPdfs'=>6,'driveFilesVerified'=>12])."\n";
}catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
