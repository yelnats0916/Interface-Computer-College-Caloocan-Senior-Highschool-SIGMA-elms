<?php
// CLI installer for reviewed additional coursework, preserving all existing materials.
if(PHP_SAPI!=='cli')exit;
$root=$argv[1];$source=$argv[2];require $root.'/config/database.php';require $root.'/php/includes/material_storage.php';require $root.'/php/includes/material_provenance.php';require $root.'/php/includes/activity_audit.php';
$items=json_decode(file_get_contents($source.'/manifest.json'),true,512,JSON_THROW_ON_ERROR);
if(count($items)!==18)throw new RuntimeException('Expected 18 authored items.');
$subject=$pdo->query("SELECT * FROM subjects WHERE id='CORE-112-RW' AND code='RW-11-12' AND is_deleted=0")->fetch(PDO::FETCH_ASSOC);
$actor=$pdo->query("SELECT * FROM users WHERE id='0000000' AND is_deleted=0 AND LOWER(status)='active'")->fetch(PDO::FETCH_ASSOC);
if(!$subject || !$actor || $subject['status']!=='Draft')throw new RuntimeException('Expected draft subject and active creator.');
$backup=dirname($source).'/additional-coursework-before-v119.json';if(!file_exists($backup)){file_put_contents($backup,json_encode($subject,JSON_THROW_ON_ERROR));chmod($backup,0600);}
$token=getGdriveAccessToken('');$settings=loadServiceSettings();$driveRoot=$settings['google_drive']['folder_id']??'';if(!$token||!$driveRoot)throw new RuntimeException('Google Drive is not connected.');
function courseworkDrive($url){global $token;$ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token],CURLOPT_TIMEOUT=>30,CURLOPT_CONNECTTIMEOUT=>10]);$data=json_decode(curl_exec($ch),true);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);if($status!==200||!is_array($data))throw new RuntimeException('Drive verification request failed.');return $data;}
$about=courseworkDrive('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)');if(strtolower($about['user']['emailAddress']??'')!=='sigma.icc.sh@gmail.com')throw new RuntimeException('Incorrect connected Google account.');
$topics=json_decode($subject['topics'],true);$new=[];$receipts=[];$progress=[];$journal=dirname($source).'/additional-coursework-journal-v119.json';
foreach($items as $item){
 if(!in_array($item['type'],['Activity','Assignment','Performance Task'],true)||!preg_match('/^RW-11-12-EXTRA-T\d{2}-\d{2}$/D',$item['id']))throw new RuntimeException('Unexpected coursework type or identifier.');
 $topic=null;foreach($topics as $t)if($t['id']===$item['topicId'])$topic=$t;if(!$topic||$topic['quarter']!==$item['quarter'])throw new RuntimeException('Topic mismatch.');
 if((bool)$item['hasRubric']!==isset($item['assets']['rubric']))throw new RuntimeException('Rubric selection mismatch.');
 $folderPath=sigmaMaterialFolderPath($actor,$subject,$topic,$item['title'],'instructions',$item['type']);$folder=resolveGdriveFolderPath($token,$driveRoot,$folderPath);if(empty($folder['id']))throw new RuntimeException('Unable to resolve coursework folder.');
 $assets=[];
 foreach($item['assets'] as $kind=>$asset){
  if(!in_array($kind,['instructions','rubric'],true)||!preg_match('/^RW_Additional_\d{2}_(Instructions|Rubric)\.pdf$/D',$asset['fileName']))throw new RuntimeException('Invalid authored file.');
  $path=$source.'/'.$asset['fileName'];if(!is_file($path)||hash_file('sha256',$path)!==$asset['sha256'])throw new RuntimeException('Authored file integrity mismatch.');
  $url='uploads/documents/'.substr($asset['sha256'],0,16).'_'.$asset['fileName'];$target=$root.'/'.$url;
  if(!is_file($target)){if(!copy($path,$target))throw new RuntimeException('Local file copy failed.');chmod($target,0644);}
  if(hash_file('sha256',$target)!==$asset['sha256'])throw new RuntimeException('Stored file integrity mismatch.');
  $query="'".$folder['id']."' in parents and trashed=false and name='".$asset['fileName']."'";
  $found=courseworkDrive('https://www.googleapis.com/drive/v3/files?q='.urlencode($query).'&fields=files(id)&pageSize=100')['files']??[];
  if(count($found)>1)throw new RuntimeException('Duplicate coursework files detected.');
  if($found)$fileId=$found[0]['id'];else{$upload=sigmaUploadDriveFile($token,$path,$asset['fileName'],$folder['id']);if(empty($upload['id']))throw new RuntimeException('Drive upload failed.');$fileId=$upload['id'];}
  $file=courseworkDrive('https://www.googleapis.com/drive/v3/files/'.$fileId.'?fields=id,name,md5Checksum,parents,owners(emailAddress),webViewLink,webContentLink');
  if(($file['md5Checksum']??'')!==md5_file($path)||$file['name']!==$asset['fileName']||!in_array($folder['id'],$file['parents']??[],true)||!in_array('sigma.icc.sh@gmail.com',array_column($file['owners']??[],'emailAddress'),true))throw new RuntimeException('Drive file verification failed.');
  $receipt=substr(hash('sha256',$item['id'].'-'.$kind),0,32);
  $assets[$kind]=['url'=>$url,'fileName'=>$asset['fileName'],'size'=>filesize($target),'uploadId'=>$receipt,'google_drive'=>['folder_id'=>$folder['id'],'folder_url'=>$folder['url'],'file_id'=>$fileId,'view_link'=>$file['webViewLink']??'','download_link'=>$file['webContentLink']??'','synced'=>true]];
  $receipts[]=['id'=>$receipt,'topic'=>$topic['id'],'title'=>$item['title'],'kind'=>$kind,'url'=>$url,'fileName'=>$asset['fileName'],'path'=>$folderPath,'fileId'=>$fileId,'folderId'=>$folder['id']];
 }
 $main=$assets['instructions'];$rubric=$assets['rubric']??null;
 $material=array_intersect_key($item,array_flip(['id','type','category','title','description','topicId','quarter','competencyCodes','hasRubric']));
 $material+=['status'=>'Draft','sourceType'=>'file','fileType'=>'pdf','url'=>$main['url'],'fileUrl'=>$main['url'],'fileName'=>$main['fileName'],'fileSize'=>$main['size'],'fileUrlStorage'=>$main,
 'rubricFileName'=>$rubric['fileName']??'','rubricUrl'=>$rubric['url']??'','rubricFileSize'=>$rubric['size']??'','rubric'=>$rubric['fileName']??'','rubricSetByAdmin'=>(bool)$rubric,'rubricIncludedInDocument'=>false,'attachments'=>[]];
 if($rubric){$material['rubricUrlStorage']=$rubric;$material['maxScore']=100;$material['totalPoints']=100;}
 $new[]=$material;$progress[]=['id'=>$item['id'],'type'=>$item['type'],'hasRubric'=>$item['hasRubric'],'files'=>count($assets),'verified'=>true];file_put_contents($journal,json_encode($progress,JSON_PRETTY_PRINT));chmod($journal,0600);
 echo 'Prepared '.$item['id'].' '.$item['type']."\n";flush();
}
$pdo->beginTransaction();try{
 $row=$pdo->query("SELECT topics,materials FROM subjects WHERE id='CORE-112-RW' FOR UPDATE")->fetch(PDO::FETCH_ASSOC);$data=['topics'=>json_decode($row['topics'],true),'materials'=>json_decode($row['materials'],true)];$previous=$data;$known=sigmaCollectSubjectMaterials($data);$added=0;
 foreach($new as $m){
  if(isset($known[$m['id']]))continue;
  $data['materials'][]=$m;
  foreach($data['topics'] as &$topic)if($topic['id']===$m['topicId']){
   $specific=['Activity'=>'activities','Assignment'=>'assignments','Performance Task'=>'performanceTasks'][$m['type']];
   foreach(['materials','allMaterials',$specific] as $key){if(!isset($topic[$key]))$topic[$key]=[];$topic[$key][]=$m;}
  }unset($topic);$added++;
 }
 $created=sigmaStampSubjectMaterials($data,$previous,$actor);
 $pdo->prepare('UPDATE subjects SET topics=?,materials=? WHERE id=?')->execute([json_encode($data['topics'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),json_encode($data['materials'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$subject['id']]);
 foreach($receipts as $r)$pdo->prepare('INSERT INTO material_uploads(id,actor_id,subject_id,topic_id,material_title,asset_kind,local_url,file_name,folder_path,drive_file_id,drive_folder_id,synced_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE id=VALUES(id)')->execute([$r['id'],$actor['id'],$subject['id'],$r['topic'],$r['title'],$r['kind'],$r['url'],$r['fileName'],json_encode($r['path']),$r['fileId'],$r['folderId']]);
 foreach($created as $m)sigmaRecordActivity($pdo,$actor['id'],'Created Material','Curriculum','Title: '.$m['title']."\nType: ".$m['type']."\nSubject: RW-11-12",['materialId'=>$m['id'],'subjectId'=>$subject['id'],'topicId'=>$m['topicId'],'material'=>$m]);
 $pdo->commit();echo json_encode(['added'=>$added,'authoredItems'=>18,'withRubric'=>12,'withoutRubric'=>6,'verifiedDriveFiles'=>count($receipts),'existingMaterialsPreserved'=>count($previous['materials'])])."\n";
}catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
