<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require_once __DIR__.'/../includes/ai_request_auth.php';
require_once __DIR__.'/../includes/academic_evidence.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['success'=>false,'error'=>'Method not allowed.']);
    exit;
}
$actor=sigmaRequireAiActor(['student','teacher']);
try {
    $role=academicRole($actor);
    $student=$role==='student';
    $db=serviceSettingsPdo();
    $subjects=$db->query('SELECT * FROM subjects WHERE is_deleted=0')->fetchAll(PDO::FETCH_ASSOC);
    $sections=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll(PDO::FETCH_ASSOC);
    $releaseRows=$db->query("SELECT subject_id,section_id,payload FROM academic_records WHERE record_type='release' AND item_id='assessments' AND (student_id='' OR student_id IS NULL)")->fetchAll(PDO::FETCH_ASSOC);
    $releases=[];
    foreach($releaseRows as $row){
        $config=json_decode($row['payload']??'',true);
        if(!is_array($config)||sigmaSyntheticRecordPath($config))continue;
        $releases[(string)$row['subject_id'].':'.(string)$row['section_id']]=$config;
    }

    $events=[];
    $timezone=new DateTimeZone('Asia/Manila');
    foreach($subjects as $subject)foreach($sections as $section){
        if(sigmaSyntheticRecordPath($subject)||sigmaSyntheticRecordPath($section)||!academicSectionSubjects($section,$subject))continue;
        if($student){
            if(strtolower((string)($section['status']??''))!=='deployed'||strtolower((string)($subject['status']??''))!=='published'||!gradeStudent($section,$actor))continue;
        }elseif(!academicTeacher($section,$actor,$subject))continue;

        $config=$releases[(string)$subject['id'].':'.(string)$section['id']]??[];
        foreach(academicItems($subject) as $item){
            if(($item['kind']??'')!=='assessment')continue;
            $release=academicReleaseFromConfig($config,$item,$student?(string)$actor['id']:'');
            if(!$release)continue;
            $itemId=(string)$item['id'];
            $dueAt=$release['dueAt']??'';
            $endSchedules=is_array($config['assessmentEndSchedules']??null)?$config['assessmentEndSchedules']:[];
            $hasConfiguredEnd=array_key_exists($itemId,$endSchedules);
            if(!$dueAt&&!$hasConfiguredEnd){
                foreach(['dueDate','deadline','due','endDate','endSchedule','targetDueDate','dateDue'] as $field){
                    $candidate=$item['data'][$field]??'';
                    if(is_string($candidate)&&trim($candidate)!==''){$dueAt=trim($candidate);break;}
                }
            }
            if(!is_string($dueAt)||!preg_match('/^\d{4}-\d{2}-\d{2}/',$dueAt))continue;
            try{
                if(preg_match('/(?:Z|[+-]\d{2}:?\d{2})$/',$dueAt)){
                    $due=(new DateTimeImmutable($dueAt))->setTimezone($timezone);
                    $date=$due->format('Y-m-d');$time=$due->format('H:i');
                }else{
                    $date=substr($dueAt,0,10);$time='23:59';
                    if(preg_match('/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/',$dueAt,$match))$time=$match[1].':'.$match[2];
                    $validDate=new DateTimeImmutable($date,$timezone);
                    if($validDate->format('Y-m-d')!==$date)continue;
                    [$hour,$minute]=array_map('intval',explode(':',$time));
                    if($hour>23||$minute>59)continue;
                }
            }catch(Throwable $error){continue;}

            $title=academicText($item['data']['title']??$item['data']['name']??'',200);
            if($title==='')continue;
            $quarter=(int)preg_replace('/\D/','',(string)($item['data']['quarter']??''));
            $events[]=[
                'id'=>'assessment-due:'.rawurlencode((string)$subject['id']).':'.rawurlencode((string)$section['id']).':'.rawurlencode($itemId),
                'date'=>$date,'time'=>$time,'dueAt'=>$dueAt,'title'=>$title,
                'subject'=>academicText($subject['name']??'',160),'section'=>academicText($section['name']??'',160),
                'quarter'=>$quarter?:null,'subjectId'=>(string)$subject['id'],'sectionId'=>(string)$section['id'],
                'itemId'=>$itemId,'role'=>$student?'Student':'Teacher','isAssessment'=>true
            ];
        }
    }
    usort($events,fn($a,$b)=>strcmp($a['date'].$a['time'].$a['title'],$b['date'].$b['time'].$b['title']));
    echo json_encode(['success'=>true,'userId'=>(string)$actor['id'],'events'=>$events],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
}catch(Throwable $error){
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'Assessment calendar events are unavailable.']);
}
