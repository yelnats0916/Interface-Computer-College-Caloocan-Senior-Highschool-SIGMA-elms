<?php
/** Course imports add missing catalog items without replacing saved authored work. */
function sigmaMergeSubjectCoursework(array $existing, array $incoming): array {
    $list=static fn($value)=>is_array($value)?$value:(json_decode((string)$value,true)?:[]);
    $merge=static function(array $saved,array $added): array {
        $result=$saved;$ids=[];
        foreach($saved as $item)if(is_array($item)&&isset($item['id']))$ids[(string)$item['id']]=true;
        foreach($added as $item){
            if(!is_array($item)||empty($item['id']))continue;
            if(isset($ids[(string)$item['id']]))continue;
            $result[]=$item;$ids[(string)$item['id']]=true;
        }
        return array_values($result);
    };
    $topics=$list($existing['topics']??[]);$newTopics=$list($incoming['topics']??[]);
    $byId=array_column($newTopics,null,'id');
    foreach($topics as &$topic){
        if(!is_array($topic)||!isset($byId[(string)($topic['id']??'')]))continue;
        $new=$byId[(string)$topic['id']];
        foreach(['materials','allMaterials','handouts','assignments','performanceTasks','quizzes','videos','activities'] as $key){
            if(isset($new[$key]))$topic[$key]=$merge($list($topic[$key]??[]),$list($new[$key]));
        }
    }
    unset($topic);
    return ['topics'=>$merge($topics,$newTopics),'materials'=>$merge($list($existing['materials']??[]),$list($incoming['materials']??[]))];
}
