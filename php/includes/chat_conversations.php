<?php
/** Build the owner's chat history from the original saved exchanges. */
function sigmaConversationHistory(array $rows): array {
    $chats=[];
    usort($rows,fn($a,$b)=>strcmp((string)($a['timestamp']??''),(string)($b['timestamp']??'')));
    foreach($rows as $log){
        if(!is_string($log['prompt']??null)||!is_string($log['response']??null)||trim($log['response'])==='')continue;
        $time=strtotime($log['timestamp']??'');if($time===false)continue;
        $id=trim((string)($log['conversationId']??''));
        if($id==='')$id='request-'.substr(hash('sha256',(string)$log['id']),0,48);
        if(!isset($chats[$id]))$chats[$id]=['id'=>$id,'title'=>mb_substr(trim((string)($log['conversationTitle']??''))?:$log['prompt'],0,80),'updatedAt'=>$time*1000,'messages'=>[]];
        $saved=$log['messages']??[];$last=is_array($saved)?end($saved):false;
        $chats[$id]['messages'][]=['role'=>'user','text'=>$log['prompt'],'timestamp'=>gmdate('c',$time),'generationId'=>$log['id']];
        $answer=['role'=>'assistant','text'=>$log['response'],'timestamp'=>gmdate('c',$time),'generationId'=>$log['id']];
        foreach(['model','provider'] as $key)if(isset($log[$key]))$answer[$key]=$log[$key];
        if(is_array($last)&&isset($last['sourceChoice']))$answer['sourceChoice']=$last['sourceChoice'];
        $chats[$id]['messages'][]=$answer;
        $chats[$id]['updatedAt']=max($chats[$id]['updatedAt'],$time*1000);
        if(trim((string)($log['conversationTitle']??''))!=='')$chats[$id]['title']=mb_substr(trim($log['conversationTitle']),0,80);
    }
    $chats=array_values($chats);usort($chats,fn($a,$b)=>$b['updatedAt']<=>$a['updatedAt']);return $chats;
}
