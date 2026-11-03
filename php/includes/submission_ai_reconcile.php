<?php
require_once __DIR__.'/submission_ai_queue.php';
require_once __DIR__.'/submission_ai_service.php';

// Recover accepted work whose queue entry was missed, including imported work
// and curriculum/rubric edits. This runs on the server without an open browser.
function sigmaReconcileSubmissionAnalysis(PDO $db): array {
    $summary=['submissions'=>0,'waiting'=>0,'saved'=>0,'unassigned'=>0,'unavailable'=>0];
    $subjects=[];$sections=[];$graders=[];
    $teachers=$db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='teacher'")->fetchAll(PDO::FETCH_ASSOC);
    $rows=$db->query("SELECT subject_id,section_id,student_id,item_id,payload FROM academic_records WHERE record_type='submission' ORDER BY updated_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    foreach($rows as $row){
        try{
            $subject=$subjects[$row['subject_id']]??=academicSubject($db,$row['subject_id']);
            if(!isset($sections[$row['section_id']])){
                $q=$db->prepare("SELECT * FROM sections WHERE id=? AND is_deleted=0");$q->execute([$row['section_id']]);
                $sections[$row['section_id']]=$q->fetch(PDO::FETCH_ASSOC)?:[];
            }
            $section=$sections[$row['section_id']];
            if(strtolower($subject['status']??'')!=='published'||strtolower($section['status']??'')!=='deployed'||!academicSectionSubjects($section,$subject))continue;
            $item=academicResolvedItem($db,$subject,$section,academicItem($subject,['itemId'=>$row['item_id']]));
            $data=$item['data'];
            if(!empty($data['quizId'])||!empty($data['selectedQuizId'])||str_contains(strtolower((string)($data['type']??$data['category']??'')),'quiz'))continue;
            $student=academicStudent($db,$section,$row['student_id']);
            $scope=$row['subject_id'].':'.$row['section_id'];
            if(!array_key_exists($scope,$graders)){
                $graders[$scope]=null;
                foreach($teachers as $teacher)if(academicTeacher($section,$teacher,$subject)&&sigmaActorPermission($teacher,'teacherGrades')){$graders[$scope]=$teacher;break;}
            }
            $actor=$graders[$scope];
            if(!$actor){$summary['unassigned']++;continue;}
            $summary['submissions']++;
            foreach(['evaluation','feedback'] as $mode){
                $feedback=$mode==='feedback';
                try{sigmaRequireSubmissionEvaluationEnabled($item,$feedback);}catch(InvalidArgumentException $error){continue;}
                // Use current evidence after taking the same queue lock as the API.
                $lock='sigma-queue:'.substr(academicKey($mode,$subject,$section,$student['id'],$item['id']),0,40);
                $q=$db->prepare('SELECT GET_LOCK(?,0)');$q->execute([$lock]);
                if(!(int)$q->fetchColumn())continue;
                try{
                    $submission=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
                    if(!$submission)continue;
                    $score=academicRead($db,'score',$subject,$section,$student['id'],$item['id']);
                    $rubric=academicRead($db,'rubric',$subject,$section,'',$item['id']);
                    if(sigmaSavedSubmissionAiResult($db,$subject,$section,$student,$item,$submission,$score,$rubric,$feedback)){$summary['saved']++;continue;}
                    $job=sigmaQueueSubmissionAnalysis($db,$actor,$subject,$section,$student['id'],$item['id'],$mode,$item,false,true);
                    // Completed metadata is not a result. Recover a removed or
                    // invalidated result, while preserving exhausted failures.
                    if(in_array($job['state']??'',['complete','superseded'],true))$job=sigmaQueueSubmissionAnalysis($db,$actor,$subject,$section,$student['id'],$item['id'],$mode,$item,true,true);
                    if(in_array($job['state']??'',['pending','processing'],true)||(($job['state']??'')==='failed'&&($job['attempts']??0)<3))$summary['waiting']++;
                }finally{$q=$db->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$lock]);}
            }
        }catch(Throwable $error){
            $summary['unavailable']++;
            error_log('Submission AI reconciliation skipped work: '.$error->getMessage());
        }
    }
    return $summary;
}
