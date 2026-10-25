<?php
require_once __DIR__.'/academic_evidence.php';

/** Resolve the section's school year, retaining its last started quarter through a break. */
function attendanceAcademicContext(array $years,array $section,string $date,array $record=[]): array {
    $label=(string)($record['schoolYear']??$section['school_year']??'');
    $digits=fn($value)=>preg_replace('/\D/','',(string)$value);
    $year=null;
    foreach($years as $candidate){
        if(!empty($candidate['is_deleted']))continue;
        if((isset($record['schoolYearId'])&&(string)$record['schoolYearId']===(string)$candidate['id']) ||
           ($label!==''&&$digits($label)===$digits($candidate['year_start'].'-'.$candidate['year_end']))){$year=$candidate;break;}
    }
    if(!$year&&$label==='')foreach($years as $candidate){
        if(empty($candidate['is_deleted'])&&!empty($candidate['q1_start'])&&!empty($candidate['q4_end'])&&$date>=$candidate['q1_start']&&$date<=$candidate['q4_end']){$year=$candidate;break;}
    }
    $quarter=(int)($record['quarter']??0);
    if($quarter<1||$quarter>4){
        $quarter=0;
        if($year&&$date>=($year['q1_start']?:'9999-12-31')&&$date<=($year['q4_end']?:'0000-01-01'))
            foreach([1,2,3,4] as $q)if(!empty($year['q'.$q.'_start'])&&$date>=$year['q'.$q.'_start'])$quarter=$q;
    }
    $context=$year?['schoolYearId'=>$year['id'],'schoolYear'=>$year['year_start'].'-'.$year['year_end']]:($label!==''?['schoolYear'=>$label]:[]);
    if($quarter)$context+=['quarter'=>$quarter,'semester'=>$quarter<=2?1:2];
    return $context;
}

function attendanceSubmit(PDO $db,array $actor,array $input): array {
    if(academicRole($actor)!=='teacher'&&!academicAdmin($actor))throw new RuntimeException('Only an assigned teacher can submit attendance.');
    if(!academicAdmin($actor)&&!sigmaActorPermission($actor,'teacherAttendance'))throw new RuntimeException('Attendance access is disabled.');
    if(($input['submitted']??false)!==true)throw new InvalidArgumentException('Submit attendance to publish its marks.');
    [$subject,$section]=academicScope($db,$actor,(string)($input['subjectId']??''),(string)($input['section']??''));
    $date=(string)($input['date']??'');
    $parsed=DateTimeImmutable::createFromFormat('!Y-m-d',$date,new DateTimeZone('Asia/Manila'));
    if(!$parsed||$parsed->format('Y-m-d')!==$date||$date>academicDay())throw new InvalidArgumentException('Choose a valid attendance date.');
    $students=$db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student'")->fetchAll(PDO::FETCH_ASSOC);
    $statuses=[];$excuses=[];
    foreach($input['statuses']??[] as $key=>$value){
        $student=null;foreach($students as $candidate)if(gradeStudent($section,$candidate)&&gradeMatches((string)$key,$candidate)){$student=$candidate;break;}
        if(!$student)throw new RuntimeException('An attendance entry is outside this section roster.');
        $value=strtolower((string)$value);$value=['p'=>'present','a'=>'absent','l'=>'late','e'=>'excused','excuse'=>'excused'][$value]??$value;
        if(!in_array($value,['present','absent','late','excused',''],true))throw new InvalidArgumentException('Invalid attendance status.');
        if($value==='')continue;
        $id=(string)$student['id'];$statuses[$id]=$value;
        if(isset($input['excuses'][$key]))$excuses[$id]=$input['excuses'][$key];
    }
    if(!$statuses)throw new InvalidArgumentException('Record at least one student before submitting attendance.');
    if(strlen(json_encode($excuses))>50000)throw new InvalidArgumentException('Attendance details exceed the supported size.');
    $record=['date'=>$date,'statuses'=>$statuses,'excuses'=>$excuses,'submitted'=>true,'submittedAt'=>gmdate('c'),'submittedBy'=>(string)$actor['id']];
    $years=$db->query('SELECT * FROM school_years WHERE is_deleted=0 ORDER BY year_start DESC')->fetchAll(PDO::FETCH_ASSOC);
    $record=array_merge($record,attendanceAcademicContext($years,$section,$date));
    academicWrite($db,$actor,'attendance',$subject,$section,'',$date,$record);
    return ['section'=>$section['name'],'subject'=>$subject['name'],'record'=>$record];
}

function attendanceSnapshot(PDO $db,array $actor): array {
    $student=academicRole($actor)==='student';$scopes=[];
    if(!$student&&!academicAdmin($actor)&&!sigmaActorPermission($actor,'teacherAttendance'))throw new RuntimeException('Attendance access is disabled.');
    $years=$db->query('SELECT * FROM school_years WHERE is_deleted=0 ORDER BY year_start DESC')->fetchAll(PDO::FETCH_ASSOC);
    $subjects=$db->query('SELECT * FROM subjects WHERE is_deleted=0')->fetchAll(PDO::FETCH_ASSOC);
    $sections=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll(PDO::FETCH_ASSOC);
    foreach($sections as $section)foreach($subjects as $subject){
        if(!academicSectionSubjects($section,$subject))continue;
        if($student?(strtolower($section['status'])!=='deployed'||strtolower($subject['status'])!=='published'||!gradeStudent($section,$actor)):
            !(academicAdmin($actor)||(academicRole($actor)==='teacher'&&academicTeacher($section,$actor,$subject))))continue;
        $q=$db->prepare("SELECT item_id,payload FROM academic_records WHERE subject_id=? AND section_id=? AND record_type='attendance'");$q->execute([$subject['id'],$section['id']]);$days=[];
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            $record=json_decode($row['payload'],true)?:[];
            if(($record['submitted']??false)!==true)continue;
            if($student){$id=(string)$actor['id'];$record['statuses']=array_intersect_key($record['statuses']??[],[$id=>true]);$record['excuses']=array_intersect_key($record['excuses']??[],[$id=>true]);unset($record['submittedBy']);}
            $record=array_merge($record,attendanceAcademicContext($years,$section,(string)$row['item_id'],$record));
            $days[$row['item_id']]=$record;
        }
        $scopes[]=['section'=>$section['name'],'subject'=>$subject['name'],'days'=>$days];
    }
    return ['success'=>true,'userId'=>(string)$actor['id'],'scopes'=>$scopes];
}
