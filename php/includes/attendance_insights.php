<?php
/** Daily attendance insights use completed, submitted meetings only. */
function academicAttendancePattern(array $records, array $roster, ?DateTimeImmutable $now=null): ?array {
    $now=($now??new DateTimeImmutable('now'))->setTimezone(new DateTimeZone('Asia/Manila'));
    // The midnight cycle evaluates the day that just ended. Never revive an
    // older meeting simply because today's cycle has no attendance evidence.
    $cutoff=$now->modify('-1 day')->format('Y-m-d');
    $earliest=$now->modify('-22 days')->format('Y-m-d');
    $meetings=[];
    foreach($records as $row){
        if(($row['record_type']??'')!=='attendance')continue;
        $data=is_array($row['payload']??null)?$row['payload']:json_decode($row['payload']??'',true);
        $date=$data['date']??'';
        if(($data['submitted']??false)!==true || !preg_match('/^\d{4}-\d{2}-\d{2}$/D',$date) || $date>$cutoff || $date<$earliest)continue;
        $statuses=[];
        foreach($roster as $student){
            $mark=strtoupper((string)($data['statuses'][$student['id']]??''));
            $mark=['PRESENT'=>'P','ABSENT'=>'A','LATE'=>'L','EXCUSED'=>'E'][$mark]??$mark;
            if(!in_array($mark,['P','A','L','E'],true))continue 2;
            $statuses[(string)$student['id']]=$mark;
        }
        if($statuses)$meetings[$date]=['date'=>$date,'statuses'=>$statuses,'sourceId'=>'attendance:'.($row['record_key']??$date)];
    }
    krsort($meetings);$meetings=array_slice(array_values($meetings),0,5);
    if(count($meetings)<3 || $meetings[0]['date']!==$cutoff)return null;
    $repeatedLate=0;$repeatedAbsent=0;$lateIds=[];$absentIds=[];
    foreach($roster as $student){
        $marks=array_column(array_column($meetings,'statuses'),(string)$student['id']);
        // Require the pattern to still be present in the newest meeting.
        if(($marks[0]??'')==='L' && count(array_filter($marks,fn($m)=>$m==='L'))>=3){$repeatedLate++;$lateIds[]=(string)$student['id'];}
        if(($marks[0]??'')==='A' && count(array_filter($marks,fn($m)=>$m==='A'))>=3){$repeatedAbsent++;$absentIds[]=(string)$student['id'];}
    }
    $absences=array_map(fn($m)=>count(array_filter($m['statuses'],fn($s)=>$s==='A')),$meetings);
    $increasing=$absences[0]>=2 && $absences[0]>$absences[1] && $absences[1]>$absences[2];
    if(!$repeatedLate && !$repeatedAbsent && !$increasing)return null;
    sort($lateIds);sort($absentIds);
    return ['id'=>'attendance-pattern:'.hash('sha256',json_encode($meetings)),
        'patternSignature'=>hash('sha256',json_encode([$lateIds,$absentIds,$increasing,$increasing?$absences[0]:0])),
        'date'=>$cutoff,'attendancePolicyVersion'=>2,'meetingCount'=>count($meetings),
        'repeatedLateStudents'=>$repeatedLate,'repeatedAbsentStudents'=>$repeatedAbsent,'increasingAbsences'=>$increasing,
        'observations'=>array_map(fn($m)=>['date'=>$m['date'],'sourceId'=>$m['sourceId'],
            'late'=>count(array_filter($m['statuses'],fn($s)=>$s==='L')),
            'absent'=>count(array_filter($m['statuses'],fn($s)=>$s==='A'))],array_reverse($meetings)),
        'allowedCategories'=>['descriptive','prescriptive']];
}

function academicAttendancePatternChanged(array $record,array $seen): bool {
    $scope=($record['subjectId']??'').':'.($record['sectionId']??'');
    return !isset($seen[$scope]) || $seen[$scope]!==($record['patternSignature']??'');
}
