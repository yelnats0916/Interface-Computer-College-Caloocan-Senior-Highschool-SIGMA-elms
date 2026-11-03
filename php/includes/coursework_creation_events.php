<?php
require_once __DIR__.'/activity_audit.php';
require_once __DIR__.'/creator_names.php';
require_once __DIR__.'/section_deployment_events.php';

function sigmaEnsureCourseworkEventSchema(PDO $db): void {
    sigmaEnsureSectionNotificationSchema($db);
    $db->exec("CREATE TABLE IF NOT EXISTS coursework_creation_events (event_key CHAR(64) PRIMARY KEY,subject_id VARCHAR(100) NOT NULL,item_id VARCHAR(191) NOT NULL,item_kind VARCHAR(16) NOT NULL,actor_id VARCHAR(50) NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function sigmaStampSubjectTopics(array &$subject,array $previous,array $actor): array {
    $old=array_column($previous['topics']??[],null,'id');$created=[];
    foreach($subject['topics'] as &$topic){
        if(!is_array($topic)||empty($topic['id']))continue;$id=(string)$topic['id'];
        if(!isset($old[$id])){
            $topic['authorId']=(string)$actor['id'];$topic['authorName']=sigmaCreatorDisplayName($actor,$actor['full_name']??'');$topic['authorRole']=$actor['role'];
            $topic['createdAt']=gmdate('c');$topic['timestamp']=$topic['createdAt'];$topic['isTeacher']=strtolower($actor['role'])==='teacher';$topic['isAdmin']=!$topic['isTeacher'];
            $created[$id]=$topic;
        }else foreach(['authorId','authorName','authorRole','createdAt','timestamp','isTeacher','isAdmin'] as $key){
            if(array_key_exists($key,$old[$id]))$topic[$key]=$old[$id][$key];else unset($topic[$key]);
        }
    }
    unset($topic);return $created;
}

function sigmaCourseworkCreationGroups(array $items,bool $recovered=false): array {
    $groups=[];
    foreach($items as $item){
        $id=(string)$item['id'];$source=$id;
        // These IDs identify section copies made by the Oral Communication recovery.
        // Ordinary new work with the same title must remain a separate creation.
        if($recovered && preg_match('/^RR-OC-(EIN|GAL|NEW)-(WORKPLACE|LESSON|TASK|QUIZ)$/D',$id,$match))$source='RR-OC-'.$match[2];
        if(!isset($groups[$source]))$groups[$source]=['item'=>$item,'creationId'=>$source,'sections'=>[]];
        $section=trim((string)($item['section']??$item['selectedSection']??''));
        if($section!==''&&!in_array($section,$groups[$source]['sections'],true))$groups[$source]['sections'][]=$section;
    }
    return array_values($groups);
}

function sigmaTeacherCourseworkNotification(array $actor,array $subject,array $item,string $kind,array $users,string $creationId=''): array {
    $members=[];foreach($users as $user){
        $role=preg_replace('/[\s_-]+/','',strtolower($user['role']??''));
        if(!in_array($role,['admin','administrator','masteradmin'],true)||!empty($user['is_deleted'])||strtolower($user['status']??'')!=='active')continue;
        $members[]=['id'=>(string)$user['id'],'name'=>$user['full_name']??'Administrator','role'=>$user['role'],'readAt'=>null];
    }
    $eventKey=hash('sha256',json_encode([(string)$subject['id'],$kind,$creationId!==''?$creationId:(string)$item['id']]));
    $teacher=sigmaCreatorDisplayName($actor,$actor['full_name']??'Teacher');$title=$item['title']??$item['name']??'Untitled';$section=$item['section']??$item['selectedSection']??'';
    $type=$kind==='topic'?'Topic':($item['type']??'Material');
    return ['id'=>'teacher-coursework-'.$eventKey,'type'=>'curriculum-update','title'=>mb_substr('New '.$type.' Added: '.$title,0,200),
        'body'=>mb_substr($teacher.' added '.strtolower($type).' "'.$title.'" to '.$subject['name'].($section!==''?' ('.$section.')':'').'.',0,4000),
        'icon'=>$kind==='topic'?'fa-solid fa-folder-plus':'fa-solid fa-file-circle-plus','senderId'=>(string)$actor['id'],'senderName'=>$teacher,'senderRole'=>$actor['role'],'senderType'=>'user',
        'assignmentScope'=>['subjectId'=>$subject['id'],'subjectName'=>$subject['name'],'section'=>$section,'quarter'=>$item['quarter']??''],
        'target'=>['subjectId'=>$subject['id'],'topicId'=>$kind==='topic'?$item['id']:($item['topicId']??''),'itemId'=>$item['id'],'materialTitle'=>$title,'tab'=>'topics'],
        'recipients'=>$members];
}

/** Caller holds the subject row lock; events, audit and notifications commit with its save. */
function sigmaPersistTeacherCourseworkEvents(PDO $db,array $actor,array $subject,array $newTopics,array $newMaterials,bool $recovered=false): int {
    if(strtolower(trim($actor['role']??''))!=='teacher')return 0;
    $users=$db->query('SELECT id,full_name,role,status,is_deleted FROM users')->fetchAll(PDO::FETCH_ASSOC);
    $claim=$db->prepare('INSERT IGNORE INTO coursework_creation_events(event_key,subject_id,item_id,item_kind,actor_id) VALUES(?,?,?,?,?)');
    $notify=$db->prepare('INSERT IGNORE INTO notification_records(id,notification_id,target_role,actor_id,payload) VALUES(?,?,?,?,?)');$count=0;
    foreach(['topic'=>$newTopics,'material'=>$newMaterials] as $kind=>$items)foreach(sigmaCourseworkCreationGroups($items,$recovered) as $group){
        $item=$group['item'];
        $notification=sigmaTeacherCourseworkNotification($actor,$subject,$item,$kind,$users,$group['creationId']);
        if(count($group['sections'])>1){
            $notification['assignmentScope']['sections']=$group['sections'];
            $notification['body'].=' Section copies: '.implode(', ',$group['sections']).'.';
        }
        if($recovered)$notification['body']='Recovered creation record. '.$notification['body'];
        $eventKey=substr($notification['id'],strlen('teacher-coursework-'));
        $claim->execute([$eventKey,$subject['id'],$item['id'],$kind,$actor['id']]);if(!$claim->rowCount())continue;
        $details='Teacher: '.$notification['senderName']."\nSubject: ".$subject['name']."\nSection: ".($notification['assignmentScope']['section']?:'Not specified')."\nQuarter: ".($item['quarter']??'')."\nTitle: ".($item['title']??$item['name']??'')."\nType: ".($kind==='topic'?'Topic':($item['type']??'Material'));
        sigmaRecordActivity($db,(string)$actor['id'],$kind==='topic'?'Created Topic':'Created Material','Curriculum',$details,
            ['subjectId'=>$subject['id'],'topicId'=>$notification['target']['topicId'],'itemId'=>$item['id'],'section'=>$notification['assignmentScope']['section'],'quarter'=>$item['quarter']??'','creationEventKey'=>$eventKey,'recoveredCreation'=>$recovered,'contentCreatedAt'=>$item['createdAt']??null]);
        if($notification['recipients']){
            $id=hash('sha256','admin|'.$notification['id'].'|');
            $notify->execute([$id,$notification['id'],'admin',$actor['id'],json_encode($notification,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
        }
        $count++;
    }
    return $count;
}
