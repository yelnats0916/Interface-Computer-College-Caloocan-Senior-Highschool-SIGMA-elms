<?php
function sigmaSectionSubjectReferences(array $section): array {
    $references=[];
    $add=function($value)use(&$references){
        if(is_array($value))$value=$value['id']??$value['code']??$value['name']??$value['subject']??$value['subjectName']??'';
        if(!is_string($value))return;$value=mb_strtolower(trim(preg_replace('/\s+/u',' ',$value)));
        if($value!=='')$references[$value]=true;
    };
    $add($section['subject']??'');
    $list=$section['subjects']??$section['assignedSubjects']??[];
    if(is_string($list))$list=json_decode($list,true)?:[];
    if(is_array($list))foreach($list as $value)$add($value);
    return array_keys($references);
}
function sigmaValidateSectionSubjectAssignments(PDO $db,array $section,?array $previous=null): void {
    $existing=$previous?sigmaSectionSubjectReferences($previous):[];
    $new=array_values(array_diff(sigmaSectionSubjectReferences($section),$existing));
    if(!$new)return;
    $catalog=$db->query('SELECT id,code,name,status,is_deleted FROM subjects')->fetchAll(PDO::FETCH_ASSOC);
    foreach($new as $reference){
        $matches=[];
        foreach($catalog as $subject){
            foreach(['id','code','name'] as $key)if(mb_strtolower(trim(preg_replace('/\s+/u',' ',$subject[$key]??'')))===$reference){$matches[]=$subject;break;}
        }
        $assignable=array_filter($matches,fn($s)=>empty($s['is_deleted'])&&in_array(strtolower(trim($s['status']??'')),['published','active'],true));
        if(!$assignable)throw new InvalidArgumentException('Only published subjects can be assigned to a section. Publish the selected subject first.');
    }
}

function sigmaSubjectRemovalReason(PDO $db,array $subject): string {
    $aliases=array_map(fn($v)=>mb_strtolower(trim(preg_replace('/\s+/u',' ',(string)$v))),[$subject['id'],$subject['code'],$subject['name']]);
    foreach($db->query('SELECT subject,subjects FROM sections')->fetchAll(PDO::FETCH_ASSOC) as $section){
        if(array_intersect($aliases,sigmaSectionSubjectReferences($section)))return 'This subject is assigned to a section and cannot be deleted.';
    }
    try {
        $q=$db->prepare('SELECT COUNT(*) FROM academic_records WHERE subject_id=?');$q->execute([$subject['id']]);
        if($q->fetchColumn())return 'This subject has academic records and cannot be deleted.';
    } catch(PDOException $e){if($e->getCode()!=='42S02')throw $e;}
    try {
        foreach($db->query('SELECT scope_json FROM grade_publications')->fetchAll(PDO::FETCH_COLUMN) as $raw){
            $scope=json_decode($raw,true);$value=mb_strtolower(trim(preg_replace('/\s+/u',' ',(string)($scope[2]??''))));
            if(in_array($value,$aliases,true))return 'This subject has saved grades or attendance and cannot be deleted.';
        }
    } catch(PDOException $e){if($e->getCode()!=='42S02')throw $e;}
    return '';
}
function sigmaAssertSubjectRemovable(PDO $db,array $subject): void {
    $reason=sigmaSubjectRemovalReason($db,$subject);if($reason!=='')throw new DomainException($reason);
}
