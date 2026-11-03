<?php
require_once __DIR__.'/creator_names.php';

/** Resolve the student's current subject teacher without changing the event actor. */
function sigmaCourseworkTeacher(array $notice,array $student,array $subjects,array $sections,array $teachers): ?array {
    if(!in_array($notice['type']??'',['submission-graded','assessment-released','assessment-updated','coursework-released','material-released','topic-released','due-reminder'],true))return null;
    $scope=$notice['assignmentScope']??[];$target=$notice['target']??[];
    $subjectValue=gradeNorm($scope['subjectId']??$target['subjectId']??'');$sectionId=(string)($scope['sectionId']??$target['sectionId']??'');$sectionName=gradeNorm($scope['section']??$target['section']??'');
    $subject=null;foreach($subjects as $candidate)if(in_array($subjectValue,academicAliases($candidate),true)){$subject=$candidate;break;}if(!$subject)return null;
    $matches=[];
    foreach($sections as $section){
        if(!empty($section['is_deleted'])||!in_array(strtolower($section['status']??''),['deployed','active','published'],true)||!gradeStudent($section,$student)||!academicSectionSubjects($section,$subject))continue;
        if($sectionId?(string)$section['id']!==$sectionId:!in_array($sectionName,[gradeNorm($section['name']),gradeNorm($section['id'])],true))continue;
        foreach($teachers as $teacher){if(!empty($teacher['is_deleted'])||strtolower($teacher['status']??'')!=='active'||academicRole($teacher)!=='teacher'||!academicTeacher($section,$teacher,$subject))continue;
            $id=(string)$teacher['id'];$matches[$id]=['id'=>$id,'name'=>sigmaCreatorDisplayName($teacher,$teacher['full_name']??'Teacher'),'role'=>'Teacher','avatarImg'=>$teacher['avatar']??'','subjectId'=>$subject['id'],'subjectName'=>$subject['name'],'sectionId'=>$section['id'],'section'=>$section['name']];
        }
    }
    return count($matches)===1?array_values($matches)[0]:null;
}
function sigmaDecorateStudentCourseworkNotices(array $feed,array $student,array $subjects,array $sections,array $teachers):array {
    foreach($feed as &$notice){$teacher=sigmaCourseworkTeacher($notice,$student,$subjects,$sections,$teachers);if($teacher)$notice['courseTeacher']=$teacher;else unset($notice['courseTeacher']);}unset($notice);return $feed;
}

/** One durable class-release alert per recipient and category/config revision. */
function sigmaPersistCourseworkReleaseNotices(PDO $db,array $actor,array $subject,array $section,string $category,array $before,array $after):int {
    if(!in_array($category,['learning','assessments'],true))return 0;
    $kind=$category==='assessments'?'assessment':'learning';$items=[];
    foreach(academicItems($subject) as $item){if($item['kind']!==$kind)continue;$scope=$item['data']['section']??'';if($scope&&$scope!==$section['name'])continue;$items[]=$item;}
    if(!$items)return 0;
    $users=$db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student'")->fetchAll(PDO::FETCH_ASSOC);
    $normalized=$after;unset($normalized['recordedAt']);$revision=hash('sha256',json_encode($normalized,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
    $write=$db->prepare('INSERT IGNORE INTO notification_records(id,notification_id,target_role,actor_id,payload) VALUES(?,?,?,?,?)');$count=0;
    foreach($users as $student){if(!gradeStudent($section,$student))continue;$changed=[];
        foreach($items as $item){$new=academicReleaseFromConfig($after,$item,(string)$student['id']);if(!$new)continue;$old=academicReleaseFromConfig($before,$item,(string)$student['id']);
            $different=!$old||$new!==$old;
            if(!$different&&$category==='assessments')$different=academicResolvedItem($db,$subject,$section,$item,$before)!==academicResolvedItem($db,$subject,$section,$item,$after);
            if(!$different&&$category==='assessments')foreach(['assessmentShowCorrectAnswers','assessmentEndSchedules','assessmentHasTimers','assessmentTimeLimitMinutes'] as $field)if(($before[$field][$item['id']]??null)!==($after[$field][$item['id']]??null))$different=true;
            if($different)$changed[]=$item;
        }
        if(!$changed)continue;$id=hash('sha256',json_encode(['class-release',$subject['id'],$section['id'],$category,(string)$student['id'],$revision]));$first=$changed[0];
        $n=['id'=>'class-release-'.$id,'type'=>'coursework-released','title'=>$category==='assessments'?'Class Assessments Available':'Class Learning Materials Available',
            'body'=>$subject['name'].' — '.count($changed).' '.($category==='assessments'?'assessments':'learning materials').' available in '.$section['name'].'.',
            'senderId'=>(string)$actor['id'],'senderName'=>sigmaCreatorDisplayName($actor,$actor['full_name']??'Academic Office'),'senderRole'=>$actor['role'],'senderType'=>'user',
            'recipientId'=>(string)$student['id'],'recipients'=>[['id'=>(string)$student['id'],'role'=>'Student','readAt'=>null]],'read'=>false,'timestamp'=>$after['recordedAt']??gmdate('c'),'icon'=>'fa-solid fa-book-open',
            'assignmentScope'=>['subjectId'=>$subject['id'],'subjectName'=>$subject['name'],'section'=>$section['name'],'sectionId'=>$section['id']],
            'target'=>['subjectId'=>$subject['id'],'section'=>$section['name'],'sectionId'=>$section['id'],'classroomId'=>$section['id'],'tab'=>$category==='assessments'?'assessments':'handouts','itemIds'=>array_column($changed,'id'),'materialTitle'=>$subject['name']]];
        $write->execute([$id,$n['id'],'student',(string)$actor['id'],json_encode($n,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);$count+=$write->rowCount();
    }
    return $count;
}
