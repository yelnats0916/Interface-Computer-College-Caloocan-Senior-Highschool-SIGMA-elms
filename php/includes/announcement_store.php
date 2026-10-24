<?php
require_once __DIR__.'/role_permissions.php';
require_once __DIR__.'/activity_audit.php';
function announcementRole(array $actor): string { return preg_replace('/[\s_-]+/', '', strtolower($actor['role'] ?? '')); }
function announcementName(array $actor): string { return trim($actor['full_name'] ?? '') ?: trim(($actor['first_name'] ?? '').' '.($actor['last_name'] ?? '')); }
function announcementToken($value): string { return strtolower(trim(preg_replace('/\s+/', ' ', preg_replace('/^grade\s*\d+\s*[-–—:]\s*/i', '', (string)$value)))); }
function announcementSections(PDO $db, array $actor): array {
    $role=announcementRole($actor); $id=(string)$actor['id'];$name=strtolower(announcementName($actor));$result=[];
    foreach($db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status) NOT IN ('draft','deleted')")->fetchAll(PDO::FETCH_ASSOC) as $section){
        $match=false;
        if($role==='student') {
            foreach(json_decode($section['students']??'[]',true)?:[] as $member){
                $memberId=is_array($member)?($member['uid']??$member['id']??$member['studentId']??''):$member;
                if((string)$memberId===$id)$match=true;
            }
            if(!empty($actor['grade_section']) && announcementToken($actor['grade_section'])===announcementToken($section['name']))$match=true;
        } else {
            if((string)($section['adviser_id']??'')===$id)$match=true;
            foreach(['teacher','adviser'] as $key)if($name!=='' && strtolower(trim($section[$key]??''))===$name)$match=true;
            foreach(json_decode($section['teachers']??'[]',true)?:[] as $teacher){
                if(is_array($teacher)) {
                    if((string)($teacher['id']??$teacher['uid']??$teacher['teacherId']??'')===$id)$match=true;
                    if($name!=='' && strtolower(trim($teacher['name']??$teacher['fullName']??$teacher['teacher']??''))===$name)$match=true;
                } elseif($name!=='' && strtolower(trim((string)$teacher))===$name)$match=true;
            }
        }
        if($match)$result[]=$section;
    }
    return $result;
}
function announcementVisible(array $post,array $actor,array $sections): bool {
    $role=announcementRole($actor);if(in_array($role,['admin','masteradmin'],true))return true;
    if((string)($post['authorId']??'')===(string)$actor['id'])return true;
    $aud=strtolower(trim($post['audience']??''));
    if($role==='student' && $aud==='teachers_only')return false;
    $ids=$post['targetStudentIds']??[];
    if($role==='student' && count($ids) && !in_array((string)$actor['id'],array_map('strval',$ids),true))return false;
    if($role==='student' && !$ids && count($post['targetStudents']??[]) && !in_array(strtolower(announcementName($actor)),array_map(fn($v)=>strtolower(trim($v)),$post['targetStudents']),true))return false;
    if(in_array($aud,['everyone','all'],true))return true;
    if($role==='student' && $aud==='all_students')return true;
    if($role==='teacher' && $aud==='teachers_only')return true;
    $sectionName=announcementToken($post['sectionName']??explode('::',$post['classroomKey']??$post['audience']??'')[0]);
    $subject=announcementToken($post['subject']??'');
    foreach($sections as $section){
        if($aud==='all_my_classes' && $role==='student' && strtolower(trim($section['teacher']??''))===strtolower(trim($post['authorName']??'')))return true;
        if(announcementToken($section['name'])!==$sectionName)continue;
        if(!$subject || announcementToken($section['subject']??'')===$subject)return true;
        foreach(json_decode($section['subjects']??'[]',true)?:[] as $entry)if(announcementToken(is_array($entry)?($entry['name']??$entry['subject']??''):$entry)===$subject)return true;
    }
    return false;
}
function announcementCanManageComments(array $actor): bool {
    $role=announcementRole($actor);
    return $role==='masteradmin' || ($role==='admin' && sigmaActorPermission($actor,'manageAnnouncementComments')) || ($role==='teacher' && sigmaActorPermission($actor,'teacherManageAnnouncementComments'));
}
function announcementCanEdit(array $post,array $actor): bool {
    return announcementRole($actor)==='masteradmin' || (in_array(announcementRole($actor),['admin','teacher'],true) && (string)($post['authorId']??'')===(string)$actor['id']);
}
function announcementCleanBody(string $body): string {
    $body=preg_replace('~<(script|style|iframe|object|svg)\b[^>]*>.*?</\1\s*>~is','',$body);
    $body=strip_tags($body,'<p><br><div><b><strong><i><em><u><ul><ol><li>');
    return preg_replace('/<(\/?)(p|br|div|b|strong|i|em|u|ul|ol|li)\b[^>]*>/i','<$1$2>',$body);
}
function announcementPublic(array $post,string $id): array {
    $post['likes']=count($post['_likedBy']??[]);$post['likedByMe']=in_array($id,$post['_likedBy']??[],true);unset($post['_likedBy']);
    // Deleted content belongs to protected Recovery, never to the public thread.
    $post['comments']=array_values(array_filter($post['comments']??[],fn($comment)=>empty($comment['isDeleted'])));
    foreach($post['comments']??[] as $index=>$comment){
        $comment['likes']=count($comment['_likedBy']??[]);$comment['likedByMe']=in_array($id,$comment['_likedBy']??[],true);unset($comment['_likedBy']);
        $post['comments'][$index]=$comment;
    }
    return $post;
}
function announcementApply(PDO $db,array $actor,array $input,array $sections): void {
    $id=(string)($input['id']??'');if(!preg_match('/^[a-zA-Z0-9_-]{1,100}$/D',$id))throw new InvalidArgumentException('Invalid announcement.');
    $q=$db->prepare('SELECT payload,is_deleted FROM school_announcements WHERE id=? FOR UPDATE');$q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
    $post=$row?json_decode($row['payload'],true):null;$action=$input['action']??'';$role=announcementRole($actor);$actorId=(string)$actor['id'];
    if(!empty($post['institutionalNotice'])&&in_array($action,['save','delete'],true))throw new DomainException('Edit or cancel this notice through System Access & Maintenance.');
    if($post && !announcementVisible($post,$actor,$sections))throw new DomainException('You cannot access this announcement.');
    if($action==='save') {
        $incoming=$input['post']??[];
        if(!in_array($role,['admin','masteradmin','teacher'],true))throw new DomainException('Only staff can publish announcements.');
        if($row && !empty($input['import']))return;
        if($row && $row['is_deleted'])throw new DomainException('This announcement was deleted.');
        if($post && !announcementCanEdit($post,$actor))throw new DomainException('Only the author or a Master Admin can edit this announcement.');
        if(!$post && !empty($incoming['authorId']) && (string)$incoming['authorId']!==$actorId)throw new DomainException('Only your own saved announcements can be published.');
        if($post && (int)($input['revision']??0)!==(int)($post['revision']??0))throw new UnexpectedValueException('This announcement changed. Refresh it before editing.');
        if($role==='teacher' && !announcementVisible(array_merge($incoming,['authorId'=>'']),$actor,$sections))throw new DomainException('Choose one of your assigned classes.');
        if($role==='teacher' && in_array(strtolower($incoming['audience']??''),['everyone','all','teachers_only','all_students'],true))throw new DomainException('Teachers can publish only to their classes.');
        $saved=$post??['id'=>$id,'comments'=>[],'_likedBy'=>[]];
        foreach(['title','body','audience','audienceLabel','audienceIcon','subject','classroomKey','sectionName','sectionRoom','targetStudentIds','targetStudents','targetStudentsLabel','priority','priorityLabel','priorityIcon','isImportant','mediaType','mediaUrl','mediaUrls','academicEvent','type'] as $key)if(array_key_exists($key,$incoming))$saved[$key]=$incoming[$key];
        if(strlen($saved['title']??'')>1200 || strlen($saved['body']??'')>80000)throw new InvalidArgumentException('Announcement text is too long.');
        foreach(['audienceIcon','priorityIcon'] as $icon)if(isset($saved[$icon]) && !preg_match('/^fa-[a-z-]+$/D',$saved[$icon]))$saved[$icon]='fa-bullhorn';
        $saved['title']=strip_tags((string)($saved['title']??''));$saved['body']=announcementCleanBody((string)($saved['body']??''));
        foreach(array_merge([$saved['mediaUrl']??''],$saved['mediaUrls']??[]) as $url)if($url!=='' && $url!==null && !preg_match('~^/?uploads/(images|videos)/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$~Di',$url))throw new InvalidArgumentException('Upload the announcement attachment before publishing.');
        if(!$post) {
            $saved['authorId']=$actorId;$saved['authorName']=announcementName($actor);$saved['authorRole']=$role==='masteradmin'?'admin':$role;$saved['authorAvatar']=$actor['avatar']??'';
        }
        $enabled=($incoming['commentsEnabled']??false)===true;
        if($enabled!==($post['commentsEnabled']??false) && !announcementCanManageComments($actor))throw new DomainException('Comment management is not enabled for this account.');
        $saved['commentsEnabled']=$enabled;
        $stamp=$incoming['createdAt']??'';
        $saved['createdAt']=$post['createdAt']??(!empty($input['import']) && strtotime($stamp)!==false && strtotime($stamp)<=time()+60 ? gmdate('Y-m-d\TH:i:s\Z',strtotime($stamp)) : gmdate('Y-m-d\TH:i:s\Z'));
        $post=$saved;
    } elseif($action==='delete') {
        if(!$post)return;
        if(!announcementCanEdit($post,$actor))throw new DomainException('You cannot delete this announcement.');
        $db->prepare('UPDATE school_announcements SET is_deleted=1,updated_at=UTC_TIMESTAMP() WHERE id=?')->execute([$id]);
        sigmaRecordActivity($db,$actorId,'Announcement deleted','Announcements','Deleted "'.($post['title']??'').'"',['announcementId'=>$id,'announcement'=>['id'=>$id,'title'=>$post['title']??'','body'=>$post['body']??'']]);
        return;
    } else {
        if(!$post || $row['is_deleted'])throw new DomainException('Announcement unavailable.');
        if($action==='like') {
            $post['_likedBy']=array_values(array_diff($post['_likedBy']??[],[$actorId]));if(($input['liked']??false)===true)$post['_likedBy'][]=$actorId;
        } elseif($action==='comment') {
            if(empty($post['commentsEnabled']))throw new DomainException('Comments are closed on this announcement.');
            $comment=$input['comment']??[];$commentId=(string)($comment['id']??'');$text=trim((string)($comment['text']??''));
            if(!preg_match('/^[a-zA-Z0-9_-]{1,100}$/D',$commentId) || $text==='' || mb_strlen($text)>1000)throw new InvalidArgumentException('Enter a comment of up to 1,000 characters.');
            foreach($post['comments']??[] as $existing)if($existing['id']===$commentId)return;
            $parent=null;foreach($post['comments']??[] as $existing)if($existing['id']===($comment['replyToCommentId']??''))$parent=$existing;
            if(!empty($comment['replyToCommentId']) && (!$parent || !empty($parent['isDeleted'])))throw new DomainException('Reply target is unavailable.');
            $post['comments'][]=['id'=>$commentId,'text'=>$text,'authorId'=>$actorId,'authorName'=>announcementName($actor),'authorRole'=>$role==='masteradmin'?'admin':$role,'authorAvatar'=>$actor['avatar']??'','createdAt'=>gmdate('Y-m-d\TH:i:s\Z'),'replyToCommentId'=>$parent['id']??null,'replyToAuthorName'=>$parent['authorName']??null,'_likedBy'=>[]];
        } elseif(in_array($action,['delete_comment','like_comment'],true)) {
            $found=false;
            foreach($post['comments']??[] as $index=>$comment){
                if($comment['id']!==($input['commentId']??''))continue;$found=true;
                if($action==='like_comment') {
                    if(!empty($comment['isDeleted']))throw new DomainException('Comment unavailable.');
                    $comment['_likedBy']=array_values(array_diff($comment['_likedBy']??[],[$actorId]));if(($input['liked']??false)===true)$comment['_likedBy'][]=$actorId;
                } else {
                    $own=(string)$comment['authorId']===$actorId;
                    $grant=$role==='masteradmin'||($role==='admin'&&sigmaActorPermission($actor,'actionDeleteComments'))||($role==='teacher'&&sigmaActorPermission($actor,'teacherDeleteComments')&&announcementCanEdit($post,$actor));
                    if(!$own && !$grant)throw new DomainException('You cannot remove this comment.');
                    if($role==='teacher' && in_array($comment['authorRole'],['admin','masteradmin'],true))throw new DomainException('You cannot remove an administrator comment.');
                    if(!empty($comment['isDeleted']))return;
                    $comment['originalText']=$comment['text'];
                    $comment['isDeleted']=true;$comment['text']='[This comment was removed]';$comment['deletedById']=$actorId;$comment['deletedByRole']=$role;$comment['deletedByName']=announcementName($actor);$comment['deletedAt']=gmdate('Y-m-d\TH:i:s\Z');
                    sigmaRecordActivity($db,$actorId,'Comment deleted','Announcements','Deleted a comment on "'.($post['title']??'').'"',['announcementId'=>$id,'commentId'=>$comment['id'],'comment'=>['authorId'=>$comment['authorId'],'text'=>$comment['originalText']]]);
                }
                $post['comments'][$index]=$comment;
            }
            if(!$found)throw new DomainException('Comment unavailable.');
        } else throw new InvalidArgumentException('Unsupported announcement action.');
    }
    $post['revision']=(int)($post['revision']??0)+1;
    $db->prepare('INSERT INTO school_announcements(id,author_id,payload,is_deleted) VALUES(?,?,?,0) ON DUPLICATE KEY UPDATE payload=VALUES(payload),updated_at=UTC_TIMESTAMP()')->execute([$id,$post['authorId'],json_encode($post,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    if($action==='save' && empty($input['import']))sigmaRecordActivity($db,$actorId,$row?'Announcement edited':'Announcement created','Announcements',($row?'Edited':'Created').' "'.($post['title']??'').'" for '.($post['audience']??'everyone'),['announcementId'=>$id,'announcement'=>['id'=>$id,'title'=>$post['title']??'','body'=>$post['body']??'']]);
}
