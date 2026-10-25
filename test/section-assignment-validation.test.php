<?php
require __DIR__.'/../php/includes/section_assignment_validation.php';
$users=[];foreach(['t1'=>'Teacher','t2'=>'Teacher','t3'=>'Teacher','s1'=>'Student','s2'=>'Student'] as $id=>$role)$users[]=['id'=>$id,'first_name'=>$id,'last_name'=>'User','role'=>$role,'status'=>'Active','is_deleted'=>0];
$section=['id'=>'a','name'=>'Einstein','grade'=>'Grade 11','schoolYear'=>'2026-2027','room'=>'302','subject'=>'General Mathematics','teachers'=>[['id'=>'t1','role'=>'Teacher']],'adviserId'=>'t2','students'=>[['id'=>'s1']],'status'=>'Deployed','dailySchedules'=>[['day'=>'Mon','active'=>true,'startTime'=>'08:00','endTime'=>'09:00']]];
sigmaValidateSectionAssignments($section,$users,[]);
$check=function($changed,$others,$message)use($users){try{sigmaValidateSectionAssignments($changed,$users,$others);throw new RuntimeException('Expected rejection: '.$message);}catch(InvalidArgumentException|DomainException $e){if(!str_contains(strtolower($e->getMessage()),strtolower($message)))throw $e;}};
$bad=$section;$bad['teachers']=[['id'=>'t1'],['id'=>'t2'],['id'=>'t3']];$check($bad,[],'at most two');
$bad=$section;$bad['teachers'][]=['id'=>'t1'];$check($bad,[],'already selected');
$bad=$section;$bad['teachers'][0]['role']='Adviser';$check($bad,[],'one adviser');
$bad=$section;$bad['students'][]=['id'=>'s1'];$check($bad,[],'already selected');
$bad=$section;$bad['students']=[['id'=>'missing']];$check($bad,[],'active student');
$bad=$section;$bad['dailySchedules'][0]['endTime']='07:00';$check($bad,[],'valid start');
$bad=$section;$bad['teachers']=[];$check($bad,[],'before deploying');
$other=$section;$other['id']='b';$check($section,[$other],'already has');
$other['name']='Newton';$check($section,[$other],'room schedule');
$other['room']='303';$check($section,[$other],'teacher schedule');
$other['teachers']=[['id'=>'t3']];$check($section,[$other],'student schedule');
$other['students']=[['id'=>'s2']];sigmaValidateSectionAssignments($section,$users,[$other]);
$other['dailySchedules'][0]['startTime']='09:00';$other['dailySchedules'][0]['endTime']='10:00';$other['teachers']=[['id'=>'t1']];$other['students']=[['id'=>'s1']];sigmaValidateSectionAssignments($section,$users,[$other]);
$draft=['name'=>'New Draft','schoolYear'=>'2026-2027','status'=>'Draft'];sigmaValidateSectionAssignments($draft,$users,[]);
echo "PASS assignment roles, active accounts, duplicates, adviser/teacher limits, required deployment fields, times and room/teacher/student conflicts; adjacent schedules and incomplete drafts allowed.\n";

$roles=sigmaSectionAdviserTeachers([['id'=>'t1','role'=>'Adviser'],['id'=>'t2','role'=>'Teacher']],'t2');
if($roles[0]['role']!=='Teacher'||$roles[1]['role']!=='Adviser')throw new RuntimeException('Canonical adviser role projection failed');
$bad=$section;$bad['teachers']=[['id'=>'t1','isPrimary'=>true],['id'=>'t3','isPrimary'=>true]];$check($bad,[],'one lead');
echo "PASS canonical adviser roles and one lead teacher.\n";
