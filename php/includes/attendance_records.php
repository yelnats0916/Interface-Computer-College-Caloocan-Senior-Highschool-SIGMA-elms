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

function attendanceImportContext(PDO $db,array $actor,array $input): array {
    if(!academicAdmin($actor)&&(academicRole($actor)!=='teacher'||!sigmaActorPermission($actor,'teacherAttendance')))throw new RuntimeException('Only an assigned teacher or administrator can import attendance.');
    [$subject,$section]=academicScope($db,$actor,(string)($input['subjectId']??''),(string)($input['section']??''));
    $years=$db->query('SELECT * FROM school_years WHERE is_deleted=0 ORDER BY year_start DESC')->fetchAll(PDO::FETCH_ASSOC);
    $academic=attendanceAcademicContext($years,$section,academicDay());$year=null;
    foreach($years as $candidate)if((string)$candidate['id']===(string)($academic['schoolYearId']??'')){$year=$candidate;break;}
    if(!$year||empty($year['q1_start'])||empty($year['q4_end']))throw new InvalidArgumentException('Configure this section’s school year dates first.');
    $students=[];
    foreach($db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student'")->fetchAll(PDO::FETCH_ASSOC) as $student){
        if(!gradeStudent($section,$student))continue;
        $name=!empty($student['last_name'])?trim($student['last_name'].', '.($student['first_name']??'').' '.($student['middle_name']??'')):(string)($student['full_name']??$student['id']);
        $students[]=['id'=>(string)$student['id'],'name'=>$name];
    }
    usort($students,fn($a,$b)=>strnatcasecmp($a['name'],$b['name']));
    $quarters=[];foreach([1,2,3,4] as $q)$quarters[]=['quarter'=>$q,'start'=>$year['q'.$q.'_start'],'end'=>$year['q'.$q.'_end']];
    return ['section'=>$section,'subject'=>$subject,'context'=>['section'=>$section['name'],'subject'=>$subject['name'],'schoolYear'=>$academic['schoolYear'],'start'=>$year['q1_start'],'end'=>$year['q4_end'],'today'=>academicDay(),'students'=>$students,'quarters'=>$quarters]];
}

/** Nonblank imported cells are patches. Validate the whole workbook before writing any day. */
function attendanceImport(PDO $db,array $actor,array $input): array {
    $scope=attendanceImportContext($db,$actor,$input);$section=$scope['section'];$subject=$scope['subject'];$context=$scope['context'];
    $days=$input['days']??[];
    if(!is_array($days)||!count($days)||count($days)>366)throw new InvalidArgumentException('Upload attendance for 1 to 366 dates.');
    $roster=array_column($context['students'],null,'id');$clean=[];$previous=[];$conflicts=[];
    ksort($days);
    foreach($days as $date=>$marks){
        $parsed=DateTimeImmutable::createFromFormat('!Y-m-d',(string)$date);
        if(!$parsed||$parsed->format('Y-m-d')!==$date||$date<$context['start']||$date>$context['end']||$date>$context['today'])throw new InvalidArgumentException('Attendance dates must be within this school year and cannot be in the future.');
        if(!is_array($marks)||count($marks)>count($roster))throw new InvalidArgumentException('Invalid attendance roster.');
        $old=academicRead($db,'attendance',$subject,$section,'',$date)??[];
        $previous[$date]=$old;$clean[$date]=[];
        foreach($marks as $id=>$mark){
            if(!isset($roster[$id]))throw new InvalidArgumentException('A student is not enrolled in this section.');
            if(!is_string($mark))throw new InvalidArgumentException('Invalid attendance mark.');
            $mark=strtolower(trim($mark));if($mark==='')continue;
            $mark=['p'=>'present','a'=>'absent','l'=>'late','e'=>'excused'][$mark]??$mark;
            if(!in_array($mark,['present','absent','late','excused'],true))throw new InvalidArgumentException('Use P, A, L, or E for attendance marks.');
            $clean[$date][$id]=$mark;$before=$old['statuses'][$id]??'';
            if($before!==''&&$before!==$mark)$conflicts[]=['date'=>$date,'id'=>(string)$id,'name'=>$roster[$id]['name'],'before'=>$before,'after'=>$mark];
        }
        if(!$clean[$date])unset($clean[$date]);
    }
    if(!$clean)throw new InvalidArgumentException('The workbook has no attendance marks to import.');
    $revision=hash('sha256',json_encode($previous,JSON_THROW_ON_ERROR));
    if($conflicts&&(($input['overwrite']??false)!==true||!hash_equals($revision,(string)($input['revision']??''))))return ['success'=>true,'needsConfirmation'=>true,'revision'=>$revision,'conflicts'=>$conflicts];
    $years=$db->query('SELECT * FROM school_years WHERE is_deleted=0 ORDER BY year_start DESC')->fetchAll(PDO::FETCH_ASSOC);$count=0;
    foreach($clean as $date=>$marks){
        $old=$previous[$date];$excuses=$old['excuses']??[];
        foreach($marks as $id=>$mark)if($mark!=='excused')unset($excuses[$id]);
        $record=array_merge($old,attendanceAcademicContext($years,$section,$date),['date'=>$date,'statuses'=>array_replace($old['statuses']??[],$marks),'excuses'=>$excuses,'submitted'=>true,'submittedAt'=>gmdate('c'),'submittedBy'=>(string)$actor['id']]);
        academicWrite($db,$actor,'attendance',$subject,$section,'',$date,$record);$count+=count($marks);
    }
    return ['success'=>true,'importedDates'=>count($clean),'importedMarks'=>$count];
}
