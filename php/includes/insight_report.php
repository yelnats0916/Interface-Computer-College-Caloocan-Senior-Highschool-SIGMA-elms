<?php
require_once __DIR__.'/ai_record_store.php';

// Batch report reads keep database work constant as the account directory grows.
function aiInsightReport(PDO $db): array {
    aiInsightControls($db);
        $users=$db->query("SELECT id,full_name,first_name,last_name,role,avatar FROM users WHERE is_deleted=0 AND LOWER(REPLACE(role,' ','')) IN ('student','teacher') ORDER BY full_name,id")->fetchAll();
        $owners=[];
        $subjectsById=[];
        try { foreach($db->query('SELECT id,name FROM subjects')->fetchAll(PDO::FETCH_ASSOC) as $subjectRow) $subjectsById[(string)$subjectRow['id']]=trim((string)$subjectRow['name']); } catch(Throwable $ignored) {}
        $subjectLabels=static function(array $records) use($subjectsById): array {
            $labels=[];
            foreach($records as $record){
                if(!is_array($record))continue;
                $subjectId=trim((string)($record['subjectId']??$record['subject_id']??''));
                $name=$subjectsById[$subjectId]??trim((string)($record['subject']??''));
                if($name==='')$name=trim((string)($record['title']??''));
                if($name!=='')$labels[$name]=$name;
            }
            return array_values($labels);
        };
        $controls=[];
        foreach($db->query('SELECT source_type,source_id,hidden,is_deleted FROM ai_insight_controls')->fetchAll() as $control)$controls[$control['source_type'].':'.$control['source_id']]=$control;
        $currentGradeViews=[];
        foreach($db->query('SELECT user_id,generation_id FROM ai_grade_insight_views')->fetchAll() as $view)$currentGradeViews[$view['user_id']][$view['generation_id']]=true;
        $gradeCards=[];
        foreach($db->query("SELECT id,user_id,payload FROM ai_logs WHERE feature='grade_insights' AND is_deleted=0 ORDER BY created_at DESC,id DESC")->fetchAll() as $record){
            $log=json_decode($record['payload'],true);
            if(!is_array($log)||!in_array($log['status']??'', ['Success','Fallback Used'],true))continue;
            $cards=json_decode($log['response']??'',true);
            if(!is_array($cards))continue;
            foreach($cards as $index=>$card){
                if(!is_array($card)||!is_array($card['analyses']??null))continue;
                $control=$controls['grade:'.$record['id'].':'.$index]??[];
                if(!empty($control['is_deleted']))continue;
                $card['sourceType']='grade';$card['sourceId']=$record['id'].':'.$index;$card['hidden']=!empty($control['hidden']);
                $card['id']=($log['generationId']??$log['id']).'-'.$index;
                $card['generationId']=$log['generationId']??null;
                $card['isCurrentStudentView']=!empty($currentGradeViews[$record['user_id']][$card['generationId']??'']);
                $card['createdAt']=$log['timestamp']??null;
                $card['reportCategory']=str_starts_with($log['prompt']??'', 'Subject Grades:')?'subject':'grade';
                $card['reportSource']=$card['reportCategory']==='subject'?'subject-grades-view':'grades-page';
                $card['sourceLabel']=$log['prompt']??'';
                $sourceRecords=[];
                foreach($log['evidenceSources']??[] as $source)foreach($source['records']??[] as $sourceRecord)$sourceRecords[]=$sourceRecord;
                $cardSubjects=$subjectLabels($sourceRecords);
                if(!$cardSubjects&&preg_match('/^(?:Subject Grades:|Class Grades:)\s*(.+?)(?:\s*\(|$)/',$log['prompt']??'', $match)){
                    foreach(explode(',', $match[1]) as $fallbackSubject){$fallbackSubject=trim($fallbackSubject);if($fallbackSubject!=='')$cardSubjects[$fallbackSubject]=$fallbackSubject;}
                    $cardSubjects=array_values($cardSubjects);
                }
                $card['subjects']=$cardSubjects;
                $card['subject']=implode(', ',$cardSubjects);
                $gradeCards[$record['user_id']][$card['id']]=$card;
            }
        }
        $states=[];
        foreach($db->query('SELECT user_id,kind,payload FROM ai_analytics_state')->fetchAll() as $stateRow){$state=json_decode($stateRow['payload'],true);$states[$stateRow['user_id']][$stateRow['kind']]=$state['lastAnalyzed']??null;}
        $dashboardCards=[];
        foreach($db->query('SELECT id,user_id,kind,payload FROM ai_insight_cards WHERE is_deleted=0 ORDER BY created_at DESC,id DESC')->fetchAll() as $stored)$dashboardCards[$stored['user_id']][$stored['kind']][]=$stored;
        foreach($users as $user){
            $kind=strtolower($user['role']);

            $cards=[];
            foreach($dashboardCards[$user['id']][$kind]??[] as $stored){
                $card=json_decode($stored['payload'],true);$control=$controls['dashboard:'.$stored['id']]??[];
                if(!is_array($card)||!empty($control['is_deleted']))continue;
                $cardSubjects=$subjectLabels($card['evidenceScopes']??[]);
                if(!$cardSubjects&&is_array($card['subjects']??null))$cardSubjects=$subjectLabels(array_map(static fn($subject)=>['subject'=>$subject],$card['subjects']));
                if(!$cardSubjects&&is_string($card['subject']??null)&&trim($card['subject'])!=='')$cardSubjects=$subjectLabels([['subject'=>$card['subject']]]);
                $card['subjects']=$cardSubjects;
                if(trim((string)($card['subject']??''))==='')$card['subject']=implode(', ',$cardSubjects);
                $card['sourceType']='dashboard';$card['sourceId']=$stored['id'];$card['hidden']=!empty($control['hidden']);$cards[]=$card;
            }
            // Dashboard cards are a different source from View Grades and GWA insights.
            foreach($cards as &$dashboardCard){$dashboardCard['reportCategory']='analytics';$dashboardCard['reportSource']='dashboard';}
            unset($dashboardCard);
            $generationIds=array_filter(array_column($cards,'generationId'));
            foreach($gradeCards[$user['id']]??[] as $card){
                if(!empty($card['generationId'])&&in_array($card['generationId'],$generationIds,true))continue;
                $cards[]=$card;
            }
            $owners[]=['id'=>$user['id'],'name'=>$user['full_name']?:trim($user['first_name'].' '.$user['last_name']),'role'=>$kind,'avatar'=>$user['avatar']??null,'cards'=>$cards,'lastAnalyzed'=>$states[$user['id']][$kind]??null];
        }
        return ['success'=>true,'users'=>$owners];
}
