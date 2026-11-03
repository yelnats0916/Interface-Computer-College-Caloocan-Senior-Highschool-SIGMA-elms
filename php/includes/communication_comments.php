<?php
require_once __DIR__.'/academic_evidence.php';
function sigmaCommentScope(PDO $db,array $actor,array $input): array {
    $subject=academicSubject($db,(string)($input['subjectId']??''));$kind=$input['kind']??'';
    if(!in_array($kind,['assessment','grade_review'],true))throw new InvalidArgumentException('Invalid comment thread.');
    $sections=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll();$section=null;
    foreach($sections as $candidate)if(in_array(gradeNorm($input['section']??''),[gradeNorm($candidate['id']),gradeNorm($candidate['name'])],true)&&academicSectionSubjects($candidate,$subject)&&empty($section))$section=$candidate;
    if(!$section)throw new InvalidArgumentException('This section assignment is unavailable.');
    $role=academicRole($actor);$adviser=false;
    foreach($sections as $candidate)if(gradeNorm($candidate['name'])===gradeNorm($section['name'])&&$candidate['school_year']===$section['school_year']&&gradeAdviser($candidate,$actor))$adviser=true;
    $allowed=academicAdmin($actor)||($role==='teacher'&&(academicTeacher($section,$actor,$subject)||($kind==='grade_review'&&$adviser)));
    $student='';$item='';$quarter=0;
    if($kind==='assessment'){$student=academicStudent($db,$section,(string)($input['studentId']??''))['id'];$item=academicItem($subject,['itemId'=>$input['itemId']??''])['id'];$allowed=$allowed||($role==='student'&&(string)$actor['id']===(string)$student&&gradeStudent($section,$actor));}
    else{$quarter=(int)($input['quarter']??0);if($quarter<1||$quarter>4)throw new InvalidArgumentException('Choose a valid quarter.');}
    if(!$allowed)throw new RuntimeException('This private thread is outside your assignment.');
    return [$subject,$section,hash('sha256',json_encode([$kind,$subject['id'],$section['id'],$student,$item,$quarter]))];
}
function sigmaEnsureComments(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS communication_comments (id VARCHAR(64) PRIMARY KEY,thread_key CHAR(64) NOT NULL,author_id VARCHAR(50) NOT NULL,payload JSON NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,KEY thread_created(thread_key,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
function sigmaReadComments(PDO $db,string $thread): array {
    $q=$db->prepare('SELECT payload FROM communication_comments WHERE thread_key=? ORDER BY created_at,id LIMIT 1000');$q->execute([$thread]);return array_map(fn($r)=>json_decode($r['payload'],true),$q->fetchAll());
}
function sigmaWriteComment(PDO $db,array $actor,string $thread,array $input): bool {
    $id=(string)($input['id']??'');if(!preg_match('/^[a-zA-Z0-9_-]{1,64}$/D',$id))throw new InvalidArgumentException('Invalid comment ID.');
    $q=$db->prepare('SELECT author_id,payload FROM communication_comments WHERE id=? AND thread_key=? FOR UPDATE');$q->execute([$id,$thread]);$old=$q->fetch();$action=$input['action']??'post';
    if($action==='delete'){if(!$old||(string)$old['author_id']!==(string)$actor['id'])throw new RuntimeException('Only the author can delete this comment.');$db->prepare('DELETE FROM communication_comments WHERE id=? AND thread_key=?')->execute([$id,$thread]);return false;}
    if($action!=='post')throw new InvalidArgumentException('Invalid comment action.');
    if($old){if((string)$old['author_id']!==(string)$actor['id'])throw new RuntimeException('Comment ID already exists.');return false;}
    $text=trim((string)($input['text']??''));if($text===''||mb_strlen($text)>1000)throw new InvalidArgumentException('Enter a comment of up to 1,000 characters.');
    $parent=(string)($input['replyToId']??'');if($parent!==''){$q=$db->prepare('SELECT id FROM communication_comments WHERE id=? AND thread_key=?');$q->execute([$parent,$thread]);if(!$q->fetchColumn())throw new InvalidArgumentException('Reply target is unavailable.');}
    $data=['id'=>$id,'authorId'=>(string)$actor['id'],'authorRole'=>academicRole($actor),'author'=>trim(($actor['first_name']??'').' '.($actor['middle_name']??'').' '.($actor['last_name']??'')),'text'=>$text,'date'=>gmdate('c'),'replyToId'=>$parent];
    $db->prepare('INSERT INTO communication_comments(id,thread_key,author_id,payload) VALUES(?,?,?,?)')->execute([$id,$thread,$actor['id'],json_encode($data,JSON_THROW_ON_ERROR)]);
    return true;
}
