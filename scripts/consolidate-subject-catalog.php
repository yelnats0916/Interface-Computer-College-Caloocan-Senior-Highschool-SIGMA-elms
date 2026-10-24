<?php
/** Reversible CLI migration: shared master subjects, school-local subject-first codes. */
if(PHP_SAPI!=='cli'){http_response_code(403);exit;}
$options=getopt('',['web:','plan:','report:','dry-run']);
$web=realpath($options['web']??'');$planPath=realpath($options['plan']??'');$report=$options['report']??'';
if(!$web||!str_starts_with($web,'/home/sigma-elms/sigma-releases/')||!$planPath||!str_starts_with($planPath,'/home/sigma-elms/sigma-private/')||!str_starts_with($report,'/home/sigma-elms/sigma-private/')||str_contains($report,'..'))throw new RuntimeException('Unexpected migration paths.');
require $web.'/config/database.php';
if($pdo->query('SELECT DATABASE()')->fetchColumn()!=='sigma-elms_db')throw new RuntimeException('Unexpected database.');
$plan=json_decode(file_get_contents($planPath),true,512,JSON_THROW_ON_ERROR);
if(count($plan['masters']??[])!==51||is_file($report))throw new RuntimeException('Unexpected or already applied plan.');
foreach(['sections','academic_records','grade_publications'] as $table){
    $sql=$table==='sections'?"SELECT COUNT(*) FROM sections WHERE is_deleted=0":"SELECT COUNT(*) FROM `$table`";
    if((int)$pdo->query($sql)->fetchColumn()!==0)throw new RuntimeException('Live dependent records require a scoped migration first: '.$table);
}
$pdo->beginTransaction();
try{
    $rows=$pdo->query('SELECT * FROM subjects WHERE is_deleted=0 FOR UPDATE')->fetchAll(PDO::FETCH_ASSOC);
    if(count($rows)!==87)throw new RuntimeException('Expected the 87 draft catalog subjects.');
    $byId=array_column($rows,null,'id');$codes=[];$expected=[];
    $signature=function($row){
        $topics=json_decode($row['topics'],true)?:[];$materials=json_decode($row['materials'],true)?:[];
        foreach(array_merge($topics,$materials) as $node)foreach(['fileUrl','fileName','url','videoUrl','quizData'] as $field)if(!empty($node[$field]))throw new RuntimeException('A catalog subject now contains uploaded work; review before merging.');
        return json_encode([array_map(fn($t)=>[$t['title']??'',$t['description']??''],$topics),array_map(fn($m)=>[$m['title']??'',$m['description']??''],$materials)]);
    };
    foreach($plan['masters'] as $group){
        if(!preg_match('/^[A-Z]+[1-4]01$/D',$group['code'])||isset($codes[$group['code']]))throw new RuntimeException('Invalid or duplicate new code.');$codes[$group['code']]=true;
        $canonical=$byId[$group['keepId']]??null;if(!$canonical)throw new RuntimeException('Master subject missing.');
        foreach($group['members'] as $id){
            $row=$byId[$id]??null;if(!$row||$row['name']!==$group['name']||strtolower($row['status'])!=='draft'||$row['type']!==$canonical['type']||$row['units']!==$canonical['units']||$row['learning_hours']!==$canonical['learning_hours']||$signature($row)!==$signature($canonical))throw new RuntimeException('Subject changed or has different curriculum: '.$id);
            if(isset($expected[$id]))throw new RuntimeException('Repeated subject in migration.');$expected[$id]=true;
        }
    }
    if(count($expected)!==87)throw new RuntimeException('Plan does not cover the full catalog.');
    if(array_key_exists('dry-run',$options)){$pdo->rollBack();echo json_encode(['validated'=>87,'masters'=>51,'duplicates'=>36,'writes'=>0]);exit;}
    $backup=$report.'.before.json';if(is_file($backup))throw new RuntimeException('Backup already exists.');
    if(file_put_contents($backup,json_encode($rows,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),LOCK_EX)===false)throw new RuntimeException('Could not write backup.');chmod($backup,0600);
    $update=$pdo->prepare('UPDATE subjects SET code=?,strand=?,grade_level=?,curriculum_metadata=? WHERE id=? AND is_deleted=0');
    $retire=$pdo->prepare('UPDATE subjects SET is_deleted=1,curriculum_metadata=? WHERE id=? AND is_deleted=0');
    foreach($plan['masters'] as $group){
        $master=$byId[$group['keepId']];$metadata=json_decode($master['curriculum_metadata'],true)?:[];$placements=[];$strands=[];$grades=[];
        foreach($group['members'] as $id){$r=$byId[$id];$placements[]=['legacyId'=>$id,'legacyCode'=>$r['code'],'strand'=>$r['strand'],'gradeLevel'=>$r['grade_level'],'activeQuarters'=>json_decode($r['active_quarters'],true),'weights'=>json_decode($r['weights'],true)];if($r['strand']!=='')$strands[]=$r['strand'];$grades[]=$r['grade_level'];}
        $metadata['masterSubject']=true;$metadata['codeConvention']='School-local subject-first code; not an official DepEd competency code';$metadata['legacyAliases']=array_values(array_unique(array_merge($group['members'],array_column($placements,'legacyCode'))));$metadata['applicableStrands']=array_values(array_unique($strands));$metadata['placements']=$placements;
        $update->execute([$group['code'],implode(', ',$metadata['applicableStrands']),count(array_unique($grades))===1?$grades[0]:'',json_encode($metadata,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$master['id']]);
        foreach($group['members'] as $id)if($id!==$master['id']){$retired=json_decode($byId[$id]['curriculum_metadata'],true)?:[];$retired['supersededBy']=$master['id'];$retired['masterCode']=$group['code'];$retire->execute([json_encode($retired,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$id]);}
    }
    $active=$pdo->query('SELECT id,code,name,type FROM subjects WHERE is_deleted=0')->fetchAll(PDO::FETCH_ASSOC);
    if(count($active)!==51||count(array_unique(array_column($active,'code')))!==51||count(array_unique(array_column($active,'name')))!==51)throw new RuntimeException('Consolidation verification failed.');
    $pdo->commit();
    $summary=['before'=>87,'remaining'=>51,'retiredDuplicates'=>36,'types'=>array_count_values(array_column($active,'type')),'codes'=>array_column($active,'code'),'changedAt'=>gmdate('c'),'backup'=>$backup];
    file_put_contents($report,json_encode($summary,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR));chmod($report,0600);echo json_encode($summary);
}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
