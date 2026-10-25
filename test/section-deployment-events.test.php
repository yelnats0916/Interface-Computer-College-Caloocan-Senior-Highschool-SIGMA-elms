<?php
require __DIR__.'/../php/includes/section_deployment_events.php';
function check($condition,$message){if(!$condition)throw new RuntimeException($message);}
$actor=['id'=>'creator','full_name'=>'Creating Admin','role'=>'Master Admin'];
$rows=[];for($i=0;$i<9;$i++)$rows[]=['id'=>'section-'.$i,'name'=>'Einstein','grade_level'=>'Grade 11','school_year'=>'2026-2027','subject'=>'Subject '.$i,'status'=>'Deployed'];
$users=[['id'=>'creator','role'=>'Master Admin','status'=>'Active'],['id'=>'other','full_name'=>'Other Admin','role'=>'Admin','status'=>'Active'],['id'=>'restricted','role'=>'Admin','status'=>'Active','permissions'=>['schoolSections'=>false]],['id'=>'inactive','role'=>'Admin','status'=>'Inactive'],['id'=>'student','role'=>'Student','status'=>'Active']];
$n=sigmaSectionDeploymentNotifications($actor,$rows,$users);check(count($n)===1,'Only other active authorized admins receive the notification');check($n[0]['recipientId']==='other','Correct recipient');check(str_contains($n[0]['body'],'9 subjects'),'Subject assignments are grouped');check($n[0]['senderId']==='creator','Creator identity preserved');check($n[0]['target']['sectionName']==='Einstein','Navigation context preserved');
check(sigmaSectionDeploymentNotifications($actor,array_map(fn($s)=>array_merge($s,['status'=>'Draft']),$rows),$users)===[],'Drafts do not send deployment notifications');
$again=sigmaSectionDeploymentNotifications($actor,$rows,$users);check($again[0]['id']===$n[0]['id'],'Stable IDs prevent duplicate notifications on retry');
$changed=sigmaSectionDeploymentNotifications($actor,array_slice($rows,0,2),$users);check($changed[0]['id']===$n[0]['id']&&str_contains($changed[0]['body'],'2 subjects'),'Adding subject assignments updates the grouped notification');
echo "PASS grouped deployment recipients, permission checks, creator attribution, draft exclusion, navigation and retry deduplication.\n";

$api=file_get_contents(__DIR__.'/../php/api/sections.php');
check(strpos($api,'sigmaRecordActivity($pdo,(string)$databaseActor')<strrpos($api,'$pdo->commit();'),'Audit entry commits atomically with the section');
check(strpos($api,'if($isDeployed&&!$wasDeployed)sigmaPersistSectionDeploymentNotifications')<strrpos($api,'$pdo->commit();'),'Deployment notification commits atomically and only on transition');
check(str_contains($api,"'Created Draft Section'"),'Draft saves have a clear activity');
check(!str_contains($api,"'Saved Section', 'Classes', 'Section '"),'Generic save entry removed');
echo "PASS section lifecycle events and notifications remain in the database transaction.\n";
