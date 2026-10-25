<?php
require_once __DIR__.'/../php/includes/school_year_notifications.php';
function check($value,$message){if(!$value)throw new Exception($message);}
$year=['id'=>'year-test','status'=>'Active','year_start'=>2026,'year_end'=>2027,'q2_start'=>'2026-08-26','q2_end'=>'2026-10-24'];
$users=[['id'=>'a1','role'=>'Master Admin','status'=>'Active'],['id'=>'a2','role'=>'Admin','status'=>'Active'],['id'=>'a3','role'=>'Admin','status'=>'Inactive'],['id'=>'t1','role'=>'Teacher','status'=>'Active'],['id'=>'s1','role'=>'Student','status'=>'Active']];
$rows=sigmaSchoolYearNotifications([$year],$users,new DateTimeImmutable('2026-10-25T01:00:00Z'));
check(count($rows)===3,'Catch up the three real quarter milestones');
foreach($rows as $row)check(array_column($row['recipients'],'id')===['a1','a2'],'Every active admin and no teacher or student receives calendar administration reminders');
check(count(sigmaSchoolYearNotifications([$year],$users,new DateTimeImmutable('2026-10-10T01:00:00Z')))===0,'No premature reminders');
check(sigmaSchoolYearNotifications([$year],$users,new DateTimeImmutable('2026-10-25T01:00:00Z'))===$rows,'Stable ids prevent duplicates');
$users[]=['id'=>'a4','role'=>'Admin','status'=>'Active'];$next=sigmaSchoolYearNotifications([$year],$users,new DateTimeImmutable('2026-10-25T01:00:00Z'));
check($next[0]['id']===$rows[0]['id']&&count($next[0]['recipients'])===3,'New active admin joins existing audience without a second notification');
echo "PASS database reminder payloads: all active admins, role separation, correct Manila milestones, catch-up, deduplication and newly added admins.\n";
