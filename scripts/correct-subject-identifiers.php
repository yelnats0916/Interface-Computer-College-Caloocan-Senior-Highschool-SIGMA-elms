<?php
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$args=getopt('',['web:','plan:','report:']);$web=realpath($args['web']??'');$plan=realpath($args['plan']??'');$report=$args['report']??'';
if(!$web||!str_starts_with($web,'/home/sigma-elms/sigma-releases/')||!$plan||!str_starts_with($plan,'/home/sigma-elms/sigma-private/')||!str_starts_with($report,'/home/sigma-elms/sigma-private/')||str_contains($report,'..')||is_file($report))throw new RuntimeException('Unexpected correction paths.');
require $web.'/config/database.php';
if($pdo->query('SELECT DATABASE()')->fetchColumn()!=='sigma-elms_db')throw new RuntimeException('Unexpected database.');
$changes=json_decode(file_get_contents($plan),true,512,JSON_THROW_ON_ERROR)['changes']??[];
if(count($changes)!==51||count(array_unique(array_column($changes,'after')))!==51)throw new RuntimeException('Expected 51 unique identifiers.');
$pdo->beginTransaction();
try{
 $rows=$pdo->query('SELECT * FROM subjects WHERE is_deleted=0 FOR UPDATE')->fetchAll(PDO::FETCH_ASSOC);$map=array_column($rows,null,'id');
 if(count($rows)!==51)throw new RuntimeException('Active catalog changed; review before correcting.');
 foreach($changes as $change){$r=$map[$change['id']]??null;if(!$r||$r['code']!==$change['before']||$r['name']!==$change['name']||!preg_match('/^[A-Z][A-Z0-9-]{1,24}$/D',$change['after']))throw new RuntimeException('Subject changed since preparation.');}
 $backup=$report.'.before.json';if(is_file($backup)||file_put_contents($backup,json_encode($rows,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),LOCK_EX)===false)throw new RuntimeException('Could not create correction backup.');chmod($backup,0600);
 $update=$pdo->prepare('UPDATE subjects SET code=?,curriculum_metadata=? WHERE id=? AND code=? AND is_deleted=0');
 foreach($changes as $change){
  $r=$map[$change['id']];$meta=json_decode($r['curriculum_metadata'],true)?:[];
  $meta['legacyAliases']=array_values(array_unique(array_merge($meta['legacyAliases']??[],[$change['before']])));
  $meta['codeConvention']='Subject-first display abbreviation; no invented college numbering. Not a complete official DepEd learning-competency code.';
  $meta['codeReference']=$change['source'];
  $update->execute([$change['after'],json_encode($meta,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$change['id'],$change['before']]);
  if($update->rowCount()!==1)throw new RuntimeException('Subject code correction failed.');
 }
 $verify=$pdo->query('SELECT id,code FROM subjects WHERE is_deleted=0')->fetchAll(PDO::FETCH_ASSOC);
 if(count($verify)!==51||count(array_unique(array_column($verify,'code')))!==51)throw new RuntimeException('Identifier verification failed.');
 $pdo->commit();$result=['corrected'=>51,'remainingSubjects'=>51,'codes'=>array_column($verify,'code'),'correctedAt'=>gmdate('c')];file_put_contents($report,json_encode($result,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR));chmod($report,0600);echo json_encode($result);
}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
