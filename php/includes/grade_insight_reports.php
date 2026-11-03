<?php
require_once __DIR__.'/academic_evidence.php';
require_once __DIR__.'/grade_insight_cache.php';

const SIGMA_GRADE_REPORT_POLICY = 6;

function sigmaGradeReportSchema(PDO $db): void {
    static $ready=[];$key=spl_object_id($db);if(isset($ready[$key]))return;
    $sql="CREATE TABLE IF NOT EXISTS grade_insight_reports (
        report_key CHAR(64) PRIMARY KEY, owner_id VARCHAR(50) NOT NULL,
        scope VARCHAR(16) NOT NULL, subject_id VARCHAR(100) NOT NULL DEFAULT '',
        section_id VARCHAR(100) NOT NULL DEFAULT '', quarter VARCHAR(8) NOT NULL,
        language VARCHAR(8) NOT NULL, context_key CHAR(64) NOT NULL,
        fingerprint CHAR(64) NOT NULL, snapshot_json LONGTEXT NOT NULL,
        dirty TINYINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY owner_scope(owner_id,scope,language)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    if($db->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite')$sql=str_replace([",\n        KEY owner_scope(owner_id,scope,language)",' ON UPDATE CURRENT_TIMESTAMP',') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'],['','',')'],$sql);
    $db->exec($sql);
    $summarySql='CREATE TABLE IF NOT EXISTS grade_insight_summaries (report_key CHAR(64) PRIMARY KEY,fingerprint CHAR(64) NOT NULL,payload LONGTEXT NOT NULL)';
    if($db->getAttribute(PDO::ATTR_DRIVER_NAME)!=='sqlite')$summarySql.=' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $db->exec($summarySql);
    $ready[$key]=true;
}

function sigmaGradeReportKey(string $owner,string $scope,string $subject,string $section,$quarter,string $language): string {
    return hash('sha256',json_encode([$owner,$scope,$subject,$section,(string)$quarter,$language]));
}

function sigmaValidateGradeReportCoverage(array $cards,array $snapshot): void {
    if(($snapshot['gradeReportPolicyVersion']??0)<SIGMA_GRADE_REPORT_POLICY)return;
    if(!$cards&&!empty($snapshot['areas']))throw new RuntimeException('A grade report must compare and explain the supplied results.');
    $cited=[];$prose='';foreach($cards as $card){$cited=array_merge($cited,$card['evidenceIds']??[]);foreach($card['analyses']??[] as $analysis)$prose.=' '.($analysis['context']??'').' '.($analysis['text']??'');}
    $high=[];$teacher=isset($snapshot['teacherId']);
    foreach($snapshot['areas'] as $area)foreach($area['records'] as $record){
        if(!$teacher&&is_numeric($record['grade']??null)&&$record['grade']>=90)$high[]=$record['id'];
        foreach($teacher?($record['students']??[]):[] as $student){
            if($student['grade']<75&&(!in_array($record['id'],$cited,true)||mb_stripos($prose,$student['name'])===false))throw new RuntimeException('Class insight must address every supplied student below the passing mark by the supplied full name.');
            if($student['grade']>=90)$high[]=$record['id'];
        }
    }
    if($high&&!array_intersect($high,$cited))throw new RuntimeException('Grade insight must acknowledge a supplied high quarterly result.');
}

// Called only while preparing source evidence, never by a page read.
function sigmaPrepareGradeReport(PDO $db,array $actor,array $input,array $snapshot,string $context,string $fingerprint): void {
    sigmaGradeReportSchema($db);
    $scope=$snapshot['scope'];$record=$snapshot['areas'][0]['records'][0]??[];
    $subject=$scope==='overall'?'':(string)($record['subjectId']??'');
    $section=$scope==='overall'?'':(string)($record['sectionId']??'');
    if($scope!=='overall'&&(!$subject||!$section))return;
    $quarter=$input['snapshot']['quarter']??'all';$language=$input['language']??'en';
    $key=sigmaGradeReportKey((string)$actor['id'],$scope,$subject,$section,$quarter,$language);
    $sql='INSERT INTO grade_insight_reports(report_key,owner_id,scope,subject_id,section_id,quarter,language,context_key,fingerprint,snapshot_json,dirty) VALUES(?,?,?,?,?,?,?,?,?,?,0)';
    $sql.=$db->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite'
        ? ' ON CONFLICT(report_key) DO UPDATE SET context_key=excluded.context_key,fingerprint=excluded.fingerprint,snapshot_json=excluded.snapshot_json,dirty=0'
        : ' ON DUPLICATE KEY UPDATE context_key=VALUES(context_key),fingerprint=VALUES(fingerprint),snapshot_json=VALUES(snapshot_json),dirty=0';
    $query=$db->prepare($sql);
    $query->execute([$key,$actor['id'],$scope,$subject,$section,(string)$quarter,$language,$context,$fingerprint,json_encode($snapshot,JSON_THROW_ON_ERROR)]);
    $summary=sigmaBuildRecordedGradeSummary($snapshot,$language,$fingerprint);
    $sql='INSERT INTO grade_insight_summaries(report_key,fingerprint,payload) VALUES(?,?,?)';
    $sql.=$db->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite'
        ? ' ON CONFLICT(report_key) DO UPDATE SET payload=CASE WHEN fingerprint<>excluded.fingerprint THEN excluded.payload ELSE payload END,fingerprint=excluded.fingerprint'
        : ' ON DUPLICATE KEY UPDATE payload=IF(fingerprint<>VALUES(fingerprint),VALUES(payload),payload),fingerprint=VALUES(fingerprint)';
    $db->prepare($sql)->execute([$key,$fingerprint,json_encode($summary,JSON_THROW_ON_ERROR)]);
}

/** A transparent calculated summary, separate from AI generations and logs. */
function sigmaBuildRecordedGradeSummary(array $snapshot,string $language,string $fingerprint): array {
    $fil=$language==='fil';$teacher=isset($snapshot['teacherId']);$quarters=[];$subjects=[];$ids=[];$raw=[];
    foreach($snapshot['areas'] as $area)foreach($area['records'] as $record){
        if(is_numeric($record['grade']??null)){
            $quarters[(int)$record['quarter']][]=$record;
            $subjects[$record['subjectId'].':'.$record['sectionId'].':'.($record['schoolYear']??'')][(int)$record['quarter']]=$record;
            $ids[]=$record['id'];
        }elseif(is_numeric($record['averagePercent']??null)){$raw[]=$record;$ids[]=$record['id'];}
    }
    $sentences=[];$concerns=[];$strengths=[];ksort($quarters);
    foreach($quarters as $q=>$records){
        usort($records,fn($a,$b)=>$a['grade']<=>$b['grade']);
        $first=$records[0];$last=$records[count($records)-1];$label='Q'.$q;
        if($teacher){
            $sentences[]=($fil?'Sa ':'For ').$first['subject'].' ('.$first['section'].'), '.$label.($fil?' na average ng klase: ': ' class average: ').$first['grade'].'.';
            $high=[];
            foreach($records as $record)foreach($record['students']??[] as $student){
                if($student['grade']<75)$concerns[]=$student['name'].' — '.$student['grade'].' ('.$label.')';
                if($student['grade']>=90)$high[]=$student+['quarter'=>$label];
            }
            usort($high,fn($a,$b)=>($b['grade']<=>$a['grade'])?:strcmp($a['name'],$b['name']));
            foreach(array_slice($high,0,3) as $student)$strengths[]=$student['name'].' — '.$student['grade'].' ('.$student['quarter'].')';
        }else{
            if(count($records)>1)$sentences[]=$label.($fil?': Mula ':': Your grades range from ').$first['grade'].' ('.$first['subject'].')'.($fil?' hanggang ':' to ').$last['grade'].' ('.$last['subject'].')'.($fil?' sa ':' across ').count($records).($fil?' asignatura.':' subjects.');
            else $sentences[]=$first['subject'].' — '.$first['grade'].' ('.$label.').';
            foreach($records as $record){
                if($record['grade']<75)$concerns[]=$record['subject'].' — '.$record['grade'].' ('.$label.')';
                if($record['grade']>=90)$strengths[]=$record['subject'].' — '.$record['grade'].' ('.$label.')';
            }
        }
    }
    if($concerns)$sentences[]=($fil?'Kailangan ng pansin, mas mababa sa passing mark na 75: ':'Needs attention, below the passing mark of 75: ').implode('; ',$concerns).'.';
    if($strengths)$sentences[]=($fil?($teacher?'Purihin ang mataas na marka: ':'Magaling sa mataas mong marka: '):($teacher?'Recognize these high grades: ':'Well done on your high grades: ')).implode('; ',$strengths).'.';
    if(!$teacher)foreach($subjects as $records){
        ksort($records);if(count($records)<2)continue;$first=reset($records);$last=end($records);$difference=round($last['grade']-$first['grade'],2);
        if($difference!==0)$sentences[]=$first['subject'].($fil?': Mula ':': From ').$first['grade'].' (Q'.$first['quarter'].')'.($fil?' naging ':' to ').$last['grade'].' (Q'.$last['quarter'].').';
    }
    if(!$quarters&&$raw){
        $groups=[];foreach($raw as $record)$groups[(int)($record['quarter']??1)][]=$record;
        foreach($groups as $q=>$records){$values=array_column($records,'averagePercent');$sentences[]='Q'.$q.($fil?': Ang porsiyento sa mga assessment ay mula ':': Assessment percentages range from ').min($values).'%'.($fil?' hanggang ':' to ').max($values).'%. '.($fil?'Hindi ito quarterly grade.':'These are assessment results, not quarterly grades.');}
    }
    if(!$sentences)return ['cards'=>[]];
    $advice=$teacher
        ? ($fil?'Repasuhin ang mga namarkahang gawain kasama ng mga estudyanteng nangangailangan ng tulong; patuloy na hamunin ang may matataas na marka.':'Review graded work with students who need support and offer suitable follow-up challenges to high scorers.')
        : ($fil?'Unahin ang pagrepaso sa mga pagkakamali sa namarkahang gawain at itanong sa guro ang mga bahaging kailangan mong linawin.':'Start by reviewing mistakes in graded work, prioritizing the subjects that need attention, and ask your teacher to clarify difficult questions.');
    $card=['id'=>'grade-summary-'.substr($fingerprint,0,20),'area'=>$snapshot['areas'][0]['id'],'title'=>$fil?'Buod ng Mga Marka':'Recorded Grade Summary','icon'=>'review','evidenceIds'=>array_values(array_unique($ids)),
        'generationSource'=>'grade_summary','createdAt'=>gmdate('c'),'analyses'=>[['category'=>'descriptive','actionLabel'=>'Try','context'=>implode("\n\n",$sentences),'text'=>$advice,'showAdviceLabel'=>false]]];
    return ['cards'=>[$card],'generationSource'=>'grade_summary'];
}

/** Return useful current grade evidence immediately and schedule AI generation separately. */
function sigmaPrepareImmediateGradeInsight(PDO $db,array $actor,array $input,string $scope,string $language,?array $preparedSnapshot=null): array {
    $request=$input;$request['feature']='grade_insights';$request['language']=$language;
    $snapshot=$preparedSnapshot;
    if($snapshot===null){
        $snapshot=academicSnapshot($db,$actor,$request,true);
        if($scope==='overall'&&academicRole($actor)==='student'){
            foreach($snapshot['areas'] as &$area)$area['records']=array_values(array_filter($area['records']??[],fn($record)=>isset($record['grade'])));
            unset($area);$snapshot['areas']=array_values(array_filter($snapshot['areas'],fn($area)=>!empty($area['records'])));
        }
    }
    if(empty($snapshot['areas']))return ['success'=>true,'cards'=>[],'snapshot'=>$snapshot,'state'=>'empty'];

    // Load the queue lazily for callers that include only the report reader.
    require_once __DIR__.'/grade_insight_jobs.php';
    $queued=sigmaReadOrQueueGradeInsight($db,$actor,$request,$snapshot);
    if(!empty($queued['generationId'])||!empty($queued['cards'])&&($queued['generationSource']??'')!=='grade_summary')return $queued;
    $fingerprint=sigmaGradeInsightEvidenceFingerprint($snapshot);
    $summary=sigmaBuildRecordedGradeSummary($snapshot,$language,$fingerprint);
    if(empty($summary['cards']))return ['success'=>true,'cards'=>[],'snapshot'=>$snapshot,'state'=>'empty'];

    $context=sigmaGradeInsightContext($snapshot,$request['snapshot']??[],$language);
    $job=$db->prepare('SELECT state,available_at FROM grade_insight_jobs WHERE owner_id=? AND context_key=?');
    $job->execute([(string)$actor['id'],$context]);$status=$job->fetch(PDO::FETCH_ASSOC)?:[];
    $due=empty($status['available_at'])||(strtotime($status['available_at'].' UTC')?:0)<=time();
    if(($queued['queued']??false)||($due&&in_array($status['state']??'', ['pending','failed'],true)))sigmaStartGradeInsightJobs((string)$actor['id'],$context);
    return ['success'=>true,'snapshot'=>$snapshot,'state'=>'ready','backgroundState'=>$queued['state']??$status['state']??'pending']+$summary;
}

function sigmaInvalidateGradeReports(PDO $db,string $subjectId,string $sectionId): void {
    // A saved result must never masquerade as current after a grade edit.
    // Never run schema DDL inside an academic save transaction.
    try {
        $query=$db->prepare("UPDATE grade_insight_reports SET dirty=1 WHERE (subject_id=? AND section_id=?) OR scope='overall'");
        $query->execute([$subjectId,$sectionId]);
    }catch(PDOException $error){if($error->getCode()!=='42S02'&&!str_contains($error->getMessage(),'no such table'))throw $error;}
}

function sigmaReusePreparedGradeResult(PDO $db,string $owner,string $fingerprint,string $language,string $context): ?array {
    // All-quarters and Q1 often contain identical evidence. Reuse only exact
    // evidence in the same account and language, without another provider call.
    $query=$db->prepare('SELECT l.payload FROM grade_insight_reports r JOIN ai_generation_ledger l ON l.owner_id=r.owner_id AND l.context_key=r.context_key WHERE r.owner_id=? AND r.fingerprint=? AND r.language=? AND r.context_key<>? AND r.dirty=0');
    $query->execute([$owner,$fingerprint,$language,$context]);
    foreach($query->fetchAll(PDO::FETCH_COLUMN) as $payload){
        $ledger=json_decode($payload,true)?:[];$result=$ledger['result']??null;
        if(is_array($result)&&sigmaGradeInsightEvidenceFingerprint($result['snapshot']??[])===$fingerprint)return $result;
    }
    return null;
}

/** Fast authorized lookup of worker-prepared evidence and its exact saved result. */
function sigmaReadPreparedGradeInsight(PDO $db,array $actor,array $input): array {
    $kind=academicRole($actor);$selector=$input['snapshot']??[];
    $scope=$selector['scope']??($kind==='student'?'overall':'class');
    $quarter=$selector['quarter']??'all';$language=($input['language']??'en')==='fil'?'fil':'en';
    if(!in_array($scope,$kind==='student'?['overall','subject']:['class'],true)||($quarter!=='all'&&(!is_numeric($quarter)||(int)$quarter<1||(int)$quarter>4)))throw new InvalidArgumentException('Invalid grade insight scope.');
    if(!academicAdmin($actor)&&!sigmaActorPermission($actor,$kind==='student'?'studentGrades':'teacherGrades'))throw new RuntimeException('Grade access is disabled for this account.');
    $owner=(string)$actor['id'];$subjectId='';$sectionId='';
    if($scope!=='overall'){
        $record=$selector['areas'][0]['records'][0]??[];
        $subject=academicSubject($db,(string)($record['subjectId']??''));
        $sections=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll(PDO::FETCH_ASSOC);
        $section=null;
        foreach($sections as $candidate)if(academicSectionScopeMatches($candidate,$record['sectionId']??'')&&academicSectionSubjects($candidate,$subject)){$section=$candidate;break;}
        if(!$section)throw new RuntimeException('This class is unavailable.');
        if($kind==='student'){
            if(!gradeStudent($section,$actor)){
                $publications=$db->query("SELECT kind,scope_json,payload FROM grade_publications WHERE kind='published'")->fetchAll(PDO::FETCH_ASSOC);
                if(!academicStudentHasPublishedGrade($publications,$actor,$subject,$section))throw new RuntimeException('This class is outside your assignment.');
            }
        }else{
            $own=$kind==='teacher'&&academicTeacher($section,$actor,$subject);
            if(!$own&&!academicAdmin($actor)&&!($kind==='teacher'&&gradeClassAdviser($sections,$section,$actor)))throw new RuntimeException('This class is outside your assignment.');
            if(!$own){
                $owner='';
                foreach($db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='teacher'")->fetchAll(PDO::FETCH_ASSOC) as $teacher)
                    if(academicTeacher($section,$teacher,$subject)){$owner=(string)$teacher['id'];break;}
            }
        }
        $subjectId=(string)$subject['id'];$sectionId=(string)$section['id'];
    }
    $key=sigmaGradeReportKey($owner,$scope,$subjectId,$sectionId,$quarter,$language);
    $query=$db->prepare('SELECT r.*,l.payload FROM grade_insight_reports r LEFT JOIN ai_generation_ledger l ON l.owner_id=r.owner_id AND l.context_key=r.context_key WHERE r.report_key=?');
    $query->execute([$key]);$report=$query->fetch(PDO::FETCH_ASSOC);
    $pending=['success'=>true,'cards'=>[],'state'=>'pending','retryAfter'=>5];
    if(!$report||!empty($report['dirty']))return sigmaPrepareImmediateGradeInsight($db,$actor,$input,$scope,$language);
    $snapshot=json_decode($report['snapshot_json'],true)?:[];
    if(empty($snapshot['areas']))return sigmaPrepareImmediateGradeInsight($db,$actor,$input,$scope,$language);
    $ledger=json_decode($report['payload']??'{}',true)?:[];$result=$ledger['result']??[];
    if(empty($result['snapshot'])||sigmaGradeInsightEvidenceFingerprint($result['snapshot'])!==$report['fingerprint']){
        $query=$db->prepare('SELECT payload FROM grade_insight_summaries WHERE report_key=? AND fingerprint=?');$query->execute([$key,$report['fingerprint']]);
        $summary=json_decode($query->fetchColumn()?:'null',true);
        return sigmaPrepareImmediateGradeInsight($db,$actor,$input,$scope,$language,$snapshot);
    }
    if(!empty($result['generationId'])){
        $query=$db->prepare('SELECT is_deleted FROM ai_logs WHERE id=?');$query->execute([$result['generationId']]);
        $deleted=$query->fetchColumn();
        if($deleted===false||(int)$deleted)$result['cards']=[];
        else $result['cards']=array_values(array_filter($result['cards']??[],function($card)use($db){
            $query=$db->prepare("SELECT hidden,is_deleted FROM ai_insight_controls WHERE source_type='grade' AND source_id=?");
            $query->execute([$card['insightSourceId']??'']);$flags=$query->fetch(PDO::FETCH_ASSOC);
            return !$flags||(!$flags['hidden']&&!$flags['is_deleted']);
        }));
    }
    return ['success'=>true]+$result+['snapshot'=>$snapshot,'cards'=>[],'state'=>'ready'];
}
