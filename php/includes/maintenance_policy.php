<?php
require_once __DIR__.'/service_secrets.php';

function sigmaMaintenanceState(array $config, ?int $now=null): array {
    $now=$now??time();$schedule=$config['schedule']??null;
    $scheduled=is_array($schedule) && empty($schedule['canceled']);
    $start=$scheduled?strtotime($schedule['startAt']??''):false;
    $end=$scheduled?strtotime($schedule['endAt']??''):false;
    $within=$start!==false && $end!==false && $now>=$start && $now<$end;
    return ['enabled'=>!empty($config['enabled'])||$within,'manualEnabled'=>!empty($config['enabled']),
        'message'=>trim($config['message']??'')?:'The system is temporarily unavailable for maintenance. Please try again later.',
        'title'=>$config['title']??'Scheduled System Maintenance','schedule'=>$schedule,
        'scheduleStatus'=>!$scheduled?'none':($now<$start?'upcoming':($within?'active':'completed')),
        'channels'=>$config['channels']??['calendar'=>true,'announcement'=>true,'banner'=>true],
        'timezone'=>'Asia/Manila','serverTime'=>gmdate('c',$now),'updatedAt'=>$config['updatedAt']??null];
}
function sigmaMaintenanceConfig(): array {
    static $config=null;
    if($config===null)$config=loadServiceSettings()['maintenance']??[];
    return $config;
}
function sigmaMaintenanceRestricted(array $user,?array $state=null): bool {
    $state=$state??sigmaMaintenanceState(sigmaMaintenanceConfig());
    return !empty($state['enabled']) && !sigmaMaintenanceCanManage($user);
}
function sigmaMaintenanceCanManage(array $user): bool {
    $role=preg_replace('/[\s_-]+/','',strtolower($user['role']??''));
    if($role==='masteradmin')return true;
    $p=is_array($user['permissions']??null)?$user['permissions']:(json_decode($user['permissions']??'{}',true)?:[]);
    return $role==='admin' && ($p['settingsMain']??true)===true && ($p['settingsSecurity']??true)===true && ($p['maintenanceManage']??false)===true;
}
function sigmaMaintenanceNoticeText($value,int $limit,string $label): string {
    if(!is_string($value))throw new InvalidArgumentException('Enter a valid '.$label.'.');
    $value=trim($value);
    if($value===''||mb_strlen($value)>$limit||preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F<>]/u',$value))throw new InvalidArgumentException('Enter a '.$label.' up to '.$limit.' characters using plain text.');
    return $value;
}
function sigmaMaintenanceHistory(PDO $db,array $config): array {
    $rows=$config['history']??[];$known=array_fill_keys(array_column($rows,'id'),true);
    // Include notices published before the dedicated history page existed.
    foreach($db->query("SELECT payload,is_deleted FROM school_announcements WHERE id LIKE 'maintenance-%'")->fetchAll(PDO::FETCH_ASSOC) as $record){
        $post=json_decode($record['payload'],true);if(empty($post['institutionalNotice'])||isset($known[$post['id']]))continue;
        $event=$post['academicEvent']??[];
        $rows[]=['id'=>$post['id'],'title'=>$post['title'],'message'=>strip_tags($post['body']??''),'publishedAt'=>$post['createdAt'],
            'publisher'=>$post['publishedBy']??'Administrator','publisherId'=>$post['authorId'],
            'startAt'=>isset($event['startDate'])?$event['startDate'].'T'.($event['startTime']?:'00:00').':00+08:00':null,
            'endAt'=>isset($event['endDate'])?$event['endDate'].'T'.($event['endTime']?:'23:59').':00+08:00':null,
            'channels'=>['announcement'=>true,'calendar'=>!empty($event),'banner'=>false], 'status'=>$record['is_deleted']?'canceled':'published'];
    }
    foreach($rows as &$row){
        if(in_array($row['status']??'',['canceled','replaced'],true))continue;
        if(!empty($row['startAt'])&&!empty($row['endAt']))$row['status']=time()<strtotime($row['startAt'])?'scheduled':(time()<strtotime($row['endAt'])?'active':'completed');
    }unset($row);
    usort($rows,fn($a,$b)=>strcmp($b['publishedAt'],$a['publishedAt']));return $rows;
}
function sigmaMaintenanceWindow(string $start,string $end,?int $now=null): array {
    $zone=new DateTimeZone('Asia/Manila');$dates=[];
    foreach([$start,$end] as $value){
        $date=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i',$value,$zone);
        if(!$date||$date->format('Y-m-d\TH:i')!==$value)throw new InvalidArgumentException('Enter valid start and end dates and times.');
        $dates[]=$date;
    }
    if($dates[0]->getTimestamp()<=($now??time()))throw new InvalidArgumentException('The start must be in the future.');
    if($dates[1]<=$dates[0])throw new InvalidArgumentException('The end must be after the start.');
    return ['startAt'=>$dates[0]->format(DateTimeInterface::ATOM),'endAt'=>$dates[1]->format(DateTimeInterface::ATOM)];
}
function sigmaMaintenancePost(array $config,array $actor): array {
    $schedule=$config['schedule'];$start=new DateTimeImmutable($schedule['startAt']);$end=new DateTimeImmutable($schedule['endAt']);
    $body='<p>'.htmlspecialchars($config['message'],ENT_QUOTES,'UTF-8').'</p>';
    $body.='<p>From '.$start->format('M j, Y, g:i A').' to '.$end->format('M j, Y, g:i A').', Manila time.</p>';
    $post=['id'=>'maintenance-'.$schedule['id'],'authorId'=>(string)$actor['id'],'authorName'=>'Interface Computer College',
        'authorRole'=>'admin','authorAvatar'=>'image/ICC logo.jpg','institutionalNotice'=>true,
        'publishedBy'=>trim($actor['full_name']??'')?:trim(($actor['first_name']??'').' '.($actor['last_name']??'')),
        'title'=>$config['title'],'body'=>$body,'audience'=>'everyone','audienceLabel'=>'Everyone',
        'priority'=>'important','priorityLabel'=>'Important','isImportant'=>true,'commentsEnabled'=>false,
        'comments'=>[],'_likedBy'=>[],'createdAt'=>gmdate('Y-m-d\TH:i:s\Z'),'revision'=>1];
    $post['academicEvent']=['title'=>$config['title'],'startDate'=>$start->format('Y-m-d'),'endDate'=>$end->format('Y-m-d'),'startTime'=>$start->format('H:i'),'endTime'=>$end->format('H:i'),'location'=>'Online portal','audience'=>'everyone'];
    // A calendar-only record is delivered by the maintenance endpoint, not the feed.
    return $post;
}
