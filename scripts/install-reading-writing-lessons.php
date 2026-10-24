<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
$root=$argv[1]??'';$source=$argv[2]??'';$actorId=$argv[3]??'';
if(!is_dir($root)||!is_dir($source)||!$actorId)throw new RuntimeException('Usage: php installer.php WEB_ROOT LESSON_FILES ACTOR_ID');
require $root.'/config/database.php';require $root.'/php/includes/material_storage.php';require $root.'/php/includes/activity_audit.php';
$q=$pdo->prepare("SELECT * FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)='active'");$q->execute([$actorId]);$actor=$q->fetch(PDO::FETCH_ASSOC);
if(!$actor||!in_array(strtolower($actor['role']),['admin','master admin'],true))throw new RuntimeException('An active administrator is required.');
$guides=json_decode(file_get_contents($source.'/lesson-manifest.json'),true,512,JSON_THROW_ON_ERROR);if(count($guides)!==6)throw new RuntimeException('Expected six lesson files.');
sigmaEnsureMaterialUploads($pdo);$pdo->beginTransaction();
try{
 $row=$pdo->query("SELECT * FROM subjects WHERE id='CORE-112-RW' AND code='RW-11-12' AND is_deleted=0 FOR UPDATE")->fetch(PDO::FETCH_ASSOC);
 if(!$row||$row['status']!=='Draft')throw new RuntimeException('The expected draft subject was not found.');
 $backup=dirname($source).'/rw-before-lesson-files.json';if(!file_exists($backup)){file_put_contents($backup,json_encode($row));chmod($backup,0600);}
 $materials=json_decode($row['materials'],true);$topics=json_decode($row['topics'],true);$replacement=[];$changes=[];
 foreach($guides as $guide){
  $existing=null;foreach($materials as $m)if($m['id']===$guide['id']){$existing=$m;break;}
  if(!$existing||$existing['type']!=='Lesson')throw new RuntimeException('Existing lesson not found.');
  $topic=null;foreach($topics as $t)if($t['id']===$existing['topicId']){$topic=$t;break;}if(!$topic)throw new RuntimeException('Lesson topic missing.');
  $input=$source.'/'.$guide['fileName'];if(!is_file($input)||filesize($input)<1000)throw new RuntimeException('Lesson PDF missing.');
  $url='uploads/documents/'.substr(hash_file('sha256',$input),0,16).'_'.$guide['fileName'];
  if(!file_exists($root.'/'.$url)&&!copy($input,$root.'/'.$url))throw new RuntimeException('Cannot save lesson file.');
  if(hash_file('sha256',$input)!==hash_file('sha256',$root.'/'.$url))throw new RuntimeException('Lesson file integrity mismatch.');
  $find=$pdo->prepare('SELECT id FROM material_uploads WHERE subject_id=? AND local_url=? AND is_superseded=0 LIMIT 1');$find->execute([$row['id'],$url]);$receipt=$find->fetchColumn();
  if(!$receipt){
   $receipt=bin2hex(random_bytes(16));$path=sigmaMaterialFolderPath($actor,$row,$topic,$existing['title'],'lesson','Lesson');
   $pdo->prepare('INSERT INTO material_uploads(id,actor_id,subject_id,topic_id,material_title,asset_kind,local_url,file_name,folder_path,sync_error) VALUES(?,?,?,?,?,?,?,?,?,?)')
    ->execute([$receipt,$actorId,$row['id'],$topic['id'],$existing['title'],'lesson',$url,$guide['fileName'],json_encode($path),'Awaiting Google account authorization for Drive file storage.']);
  }
  $m=$existing;$m['description']=$guide['description'];$m['fileName']=$guide['fileName'];$m['fileType']='pdf';$m['fileUrl']=$m['url']=$url;
  $m['fileSize']=filesize($root.'/'.$url);$m['sourceType']='file';$m['fileUrlStorage']=['uploadId'=>$receipt,'google_drive'=>['synced'=>false]];
  $m['attachments']=[];$m['uploadedBy']=['id'=>$actorId,'name'=>$actor['full_name'],'role'=>$actor['role']];$m['competencyCodes']=$guide['codes'];
  if(empty($m['authorId'])){$m['authorId']=$actorId;$m['authorName']=$actor['full_name'];$m['authorRole']=$actor['role'];$m['isAdmin']=true;$m['isTeacher']=false;}
  $m['updatedAt']=gmdate('c');$replacement[$m['id']]=$m;
  if(($existing['fileUrl']??'')!==$url||($existing['description']??'')!==$guide['description'])$changes[]=$m;
 }
 $walk=function(&$items)use(&$walk,$replacement){foreach($items as &$item){if(!is_array($item))continue;if(isset($item['id'],$replacement[$item['id']])){$item=$replacement[$item['id']];continue;}$walk($item);}};
 $walk($materials);$walk($topics);
 $pdo->prepare('UPDATE subjects SET materials=?,topics=? WHERE id=?')->execute([json_encode($materials,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),json_encode($topics,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$row['id']]);
 foreach($changes as $m)sigmaRecordActivity($pdo,$actorId,'Added Lesson File','Curriculum','Subject: RW-11-12 Reading and Writing Skills'."\nTitle: ".$m['title']."\nFile: ".$m['fileName'],['materialId'=>$m['id'],'subjectId'=>$row['id'],'topicId'=>$m['topicId'],'fileName'=>$m['fileName'],'description'=>$m['description']]);
 $pdo->commit();echo json_encode(['lessonsWithPdfs'=>count($replacement),'newLessonFiles'=>count($changes),'activityLogs'=>count($changes),'creator'=>$actor['full_name'],'subjectStatus'=>$row['status'],'driveSync'=>'pending Google account authorization'])."\n";
}catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
