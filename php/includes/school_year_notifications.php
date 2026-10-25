<?php
/** Calendar reminders are persisted once per milestone, with an administrator audience. */
function sigmaSchoolYearNotifications(array $years,array $users,DateTimeImmutable $now): array {
    $zone=new DateTimeZone('Asia/Manila');$today=$now->setTimezone($zone)->setTime(0,0);$out=[];
    $members=[];foreach($users as $user){
        if(!str_contains(strtolower($user['role']??''),'admin')||!empty($user['is_deleted'])||strtolower($user['status']??'')!=='active')continue;
        $members[]=['id'=>(string)$user['id'],'name'=>$user['full_name']??'Administrator','role'=>$user['role'],'readAt'=>null];
    }
    if(!$members)return [];
    foreach($years as $year){
        if(!empty($year['is_deleted'])||strtolower($year['status']??'')!=='active')continue;
        for($q=1;$q<=4;$q++){
            $start=$year["q{$q}_start"]??'';$end=$year["q{$q}_end"]??'';
            if(!$start||!$end)continue;
            $from=new DateTimeImmutable($start,$zone);$to=new DateTimeImmutable($end,$zone);
            if($today<$from||$today>$to->modify('+7 days'))continue;
            $name=['1st','2nd','3rd','4th'][$q-1].' Quarter';$label=$year['year_start'].'-'.$year['year_end'];
            foreach([7,1,0] as $days){
                $scheduled=$to->modify("-{$days} days");if($scheduled<$from||$today<$scheduled)continue;
                $title=$name.($days===0?' ends today':" {$days} ".($days===1?'day':'days').' left');
                $body=$days===0?$name.' ends today, '.$to->format('F j, Y').'. School Year '.$label.'.':'There '.($days===1?'is only 1 day':"are only {$days} days").' left before '.$name.' ends on '.$to->format('F j, Y').'. School Year '.$label.'.';
                $out[]=['id'=>'quarter-milestone-v2:'.$year['id'].":q{$q}:{$end}:{$days}",'title'=>$title,'dialogTitle'=>$name,'body'=>$body,'type'=>'quarter-reminder','quarterEnd'=>$end,'milestoneDays'=>$days,'scheduledFor'=>$scheduled->format('Y-m-d'),'senderName'=>'Academic Calendar','senderId'=>'system','senderRole'=>'System','senderType'=>'system','icon'=>'fa-calendar-exclamation','recipients'=>$members];
            }
        }
    }return $out;
}
function sigmaPersistSchoolYearNotifications(PDO $db): void {
    $years=$db->query("SELECT * FROM school_years WHERE is_deleted=0 AND LOWER(status)='active'")->fetchAll(PDO::FETCH_ASSOC);
    $users=$db->query("SELECT id,full_name,role,status,is_deleted FROM users WHERE is_deleted=0 AND LOWER(status)='active'")->fetchAll(PDO::FETCH_ASSOC);
    $write=$db->prepare("INSERT INTO notification_records(id,notification_id,target_role,actor_id,payload) VALUES(?,?,'admin','system',?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)");
    foreach(sigmaSchoolYearNotifications($years,$users,new DateTimeImmutable('now')) as $notice){
        $id=hash('sha256','admin|'.$notice['id'].'|');
        $write->execute([$id,$notice['id'],json_encode($notice,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    }
}
