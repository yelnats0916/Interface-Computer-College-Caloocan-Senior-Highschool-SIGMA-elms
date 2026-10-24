<?php
function sigmaCollectSubjectMaterials(array $subject): array {
    $items=[];
    foreach ($subject['materials'] ?? [] as $m) if (is_array($m) && !empty($m['id'])) $items[(string)$m['id']]=$m;
    foreach ($subject['topics'] ?? [] as $topic) {
        foreach (['materials','allMaterials','handouts','assignments','performanceTasks','quizzes','videos','activities'] as $key) {
            foreach ($topic[$key] ?? [] as $m) if (is_array($m) && !empty($m['id']) && !isset($items[(string)$m['id']])) $items[(string)$m['id']]=$m;
        }
    }
    return $items;
}

function sigmaStampSubjectMaterials(array &$subject, array $previous, array $actor): array {
    $old = sigmaCollectSubjectMaterials($previous); $new = sigmaCollectSubjectMaterials($subject); $created=[];
    foreach ($new as $id=>&$m) {
        if (!isset($old[$id])) {
            $m['authorId']=(string)$actor['id']; $m['authorName']=(string)($actor['full_name'] ?? $actor['fullName'] ?? '');
            $m['authorRole']=(string)$actor['role']; $m['createdAt']=gmdate('c'); $m['timestamp']=$m['createdAt'];
            $m['isTeacher']=strtolower($actor['role'])==='teacher'; $m['isAdmin']=!$m['isTeacher'];
            $created[$id]=$m;
        } else {
            foreach (['authorId','authorName','authorRole','createdAt','timestamp','isTeacher','isAdmin'] as $key) {
                if (array_key_exists($key,$old[$id])) $m[$key]=$old[$id][$key]; else unset($m[$key]);
            }
        }
    }
    unset($m);
    $replace=static function(array &$list) use ($new) { foreach($list as &$m) if (is_array($m) && isset($new[(string)($m['id']??'')])) $m=$new[(string)$m['id']]; };
    if (isset($subject['materials'])) $replace($subject['materials']);
    foreach ($subject['topics'] as &$topic) foreach (['materials','allMaterials','handouts','assignments','performanceTasks','quizzes','videos','activities'] as $key) if (isset($topic[$key]) && is_array($topic[$key])) $replace($topic[$key]);
    return $created;
}
