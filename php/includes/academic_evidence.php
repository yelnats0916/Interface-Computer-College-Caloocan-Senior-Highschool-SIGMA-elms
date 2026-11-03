<?php
require_once __DIR__ . '/academic_scope.php';
require_once __DIR__ . '/role_permissions.php';
require_once __DIR__ . '/data_provenance.php';
require_once __DIR__ . '/activity_audit.php';
require_once __DIR__ . '/attendance_insights.php';
require_once __DIR__ . '/grade_notifications.php';
require_once __DIR__ . '/student_insight_priority.php';
require_once __DIR__ . '/school_year_policy.php';

function academicRole(array $actor): string { return preg_replace('/[\s_-]+/', '', strtolower($actor['role'] ?? '')); }
function academicAdmin(array $actor): bool { return in_array(academicRole($actor), ['admin','masteradmin','administrator'], true); }
function academicTime(string $date): int { try { return (new DateTimeImmutable($date,new DateTimeZone('Asia/Manila')))->getTimestamp(); }catch(Throwable $e){return 0;} }
function academicDay(): string { return (new DateTimeImmutable('now',new DateTimeZone('Asia/Manila')))->format('Y-m-d'); }
function academicText($value, int $limit = 1500): string { return mb_substr(trim(strip_tags(is_scalar($value) ? (string)$value : '')), 0, $limit); }
function academicAliases(array $subject): array {
    $values = [$subject['id'], $subject['code'] ?? '', $subject['name'] ?? ''];
    $metadata=gradeList($subject['curriculum_metadata']??'');
    foreach($metadata['legacyAliases']??[] as $alias)if(is_string($alias))$values[]=$alias;
    foreach ($values as $value) $values[] = preg_replace('/^(card|subj|gen)[-_]/i', '', (string)$value);
    return array_values(array_unique(array_filter(array_map('gradeNorm', $values))));
}
function academicSubject(PDO $db, string $value): array {
    $value = gradeNorm(preg_replace('/^(card|subj|gen)[-_]/i', '', $value));
    $subjects = array_values(array_filter($db->query('SELECT * FROM subjects WHERE is_deleted=0')->fetchAll(), fn($subject) => !sigmaSyntheticRecordPath($subject)));
    // Stable IDs and codes win over a different subject's display name.
    foreach ($subjects as $subject) if (in_array($value, array_map('gradeNorm', [$subject['id'], $subject['code'] ?? '']), true)) return $subject;
    // Older classroom tabs remove title separators. Accept only an unambiguous
    // saved alias; academicScope still enforces the section and teacher assignment.
    $normalize = fn($alias) => gradeNorm(preg_replace('/[-_\x{2010}-\x{2015}]+/u', ' ', $alias));
    $key = $normalize($value);
    $matches = array_values(array_filter($subjects, fn($subject) => in_array($key, array_map($normalize, academicAliases($subject)), true)));
    if (count($matches) === 1) return $matches[0];
    throw new InvalidArgumentException('Save this subject in the live school database first.');
}
function academicSectionSubjects(array $section, array $subject): bool {
    $assigned = gradeList($section['subjects'] ?? ''); $assigned[] = $section['subject'] ?? '';
    foreach ($assigned as $item) {
        $names = is_array($item) ? array_intersect_key($item, array_flip(['id','subjectId','name','title','subject'])) : [$item];
        if (array_intersect(array_map('gradeNorm', $names), academicAliases($subject))) return true;
    }
    return gradeScopeSubjectMatches($section, $subject['name'] ?? '', [$subject]);
}
function academicSectionScopeMatches(array $section, $scopeSection): bool {
    return in_array(gradeNorm($scopeSection), [gradeNorm($section['id'] ?? ''), gradeNorm($section['name'] ?? '')], true)
        || gradeScopeSectionMatches($section, $scopeSection);
}
function academicSubjectAliasMatches($scopeSubject, array $subject): bool {
    $normalize = static function ($value): string {
        if (!is_scalar($value)) return '';
        $value = preg_replace('/[-_\x{2010}-\x{2015}\x{2212}]+/u', ' ', (string)$value);
        return gradeNorm($value);
    };
    $scopeAlias = $normalize($scopeSubject);
    if ($scopeAlias === '') return false;
    foreach (academicAliases($subject) as $alias) if ($normalize($alias) === $scopeAlias) return true;
    return false;
}
function academicSubjectScopeMatches(array $section, array $subject, $scopeSubject): bool {
    if (academicSubjectAliasMatches($scopeSubject, $subject)) return true;
    return gradeScopeSubjectMatches($section, $scopeSubject, [$subject]);
}
function academicStudentHasPublishedGrade(array $publications, array $actor, array $subject, array $section): bool {
    $studentId = (string)($actor['id'] ?? '');
    if ($studentId === '') return false;
    foreach ($publications as $publication) {
        if (($publication['kind'] ?? '') !== 'published') continue;
        $scope = json_decode($publication['scope_json'] ?? '', true);
        if (!is_array($scope)
            || !gradeScopeYearMatches($scope[0] ?? '', $section['school_year'] ?? '')
            || !academicSectionScopeMatches($section, $scope[1] ?? '')
            || !academicSubjectScopeMatches($section, $subject, $scope[2] ?? '')) continue;
        $payload = json_decode($publication['payload'] ?? '', true) ?: [];
        foreach ($payload['rows'] ?? [] as $row) {
            if (!is_numeric($row['grade'] ?? null) || $row['grade'] < 0 || $row['grade'] > 100) continue;
            $ids = array_map('strval', array_merge([(string)($row['id'] ?? '')], is_array($row['studentIds'] ?? null) ? $row['studentIds'] : []));
            if (in_array($studentId, $ids, true)) return true;
        }
    }
    return false;
}
function academicStudentPublishedGradeAssignments(array $publications, array $actor, array $subjects, array $sections): array {
    $studentId = (string)($actor['id'] ?? '');
    if ($studentId === '') return [];
    $assignments = [];
    foreach ($publications as $publication) {
        if (($publication['kind'] ?? '') !== 'published') continue;
        $payload = json_decode($publication['payload'] ?? '', true) ?: [];
        $hasStudentGrade = false;
        foreach ($payload['rows'] ?? [] as $row) {
            if (!is_numeric($row['grade'] ?? null) || $row['grade'] < 0 || $row['grade'] > 100) continue;
            $ids = array_map('strval', array_merge([(string)($row['id'] ?? '')], is_array($row['studentIds'] ?? null) ? $row['studentIds'] : []));
            if (in_array($studentId, $ids, true)) { $hasStudentGrade = true; break; }
        }
        if (!$hasStudentGrade) continue;
        $scope = json_decode($publication['scope_json'] ?? '', true);
        if (!is_array($scope)) continue;
        foreach ($subjects as $subject) {
            if (!academicSubjectAliasMatches($scope[2] ?? '', $subject)) continue;
            foreach ($sections as $section) {
                if (!gradeScopeYearMatches($scope[0] ?? '', $section['school_year'] ?? '')
                    || !academicSectionScopeMatches($section, $scope[1] ?? '')
                    || !academicSectionSubjects($section, $subject)
                    || !academicSubjectScopeMatches($section, $subject, $scope[2] ?? '')) continue;
                $assignments[(string)$subject['id'].':'.(string)$section['id']] = true;
            }
        }
    }
    return $assignments;
}
function academicTeacher(array $section, array $actor, array $subject): bool {
    foreach (academicAliases($subject) as $alias) if (gradeTeacher($section, $actor, $alias)) return true;
    return false;
}
function academicScope(PDO $db, array $actor, string $subjectValue, string $sectionValue, string $permission = ''): array {
    $subject = academicSubject($db, $subjectValue);
    $q = $db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'");
    foreach ($q->fetchAll() as $section) {
        if (!in_array(gradeNorm($sectionValue), [gradeNorm($section['id']),gradeNorm($section['name'])], true) || !academicSectionSubjects($section, $subject)) continue;
        $role = academicRole($actor);
        $allowed = academicAdmin($actor) || ($role === 'teacher' && academicTeacher($section,$actor,$subject)) || ($role === 'student' && gradeStudent($section,$actor));
        if (!$allowed || ($permission && !sigmaActorPermission($actor,$permission))) throw new RuntimeException('This subject and section are outside your permitted assignment.');
        return [$subject,$section];
    }
    throw new InvalidArgumentException('Save the subject assignment and section in the live database first.');
}
function academicStudent(PDO $db, array $section, string $id): array {
    $q=$db->prepare("SELECT * FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student'");$q->execute([preg_replace('/^std-/i','',$id)]);$student=$q->fetch();
    if (!$student || !gradeStudent($section,$student)) throw new RuntimeException('The student is not enrolled in this section.');
    return $student;
}
// Traverse only curriculum collections that exist in the subject editor. Never accept a browser title as an assessment.
function academicItems(array $subject): array {
    $items=[];
    $walk=function($nodes,string $bucket,int $topicIndex=-1,string $topicTitle='')use(&$walk,&$items){
        foreach (gradeList($nodes) as $index=>$node) {
            if (!is_array($node) || sigmaSyntheticRecordPath($node) || !empty($node['isDeleted']) || !empty($node['is_deleted'])) continue;
            $id=(string)($node['id']??$node['materialId']??$node['assessmentId']??'');
            $type=$bucket==='topics'?'topic':(in_array($bucket,['learning','materials','learningMaterials','handouts','videos','lessons'],true)?'learning':'assessment');
            if($bucket==='materials' && preg_match('/quiz|assignment|activity|performance|assessment/i',(string)($node['type']??$node['category']??'')))$type='assessment';
            // A top-level mirror must not discard the original topic association.
            if ($id!=='' && (!isset($items[$type.':'.$id]) || $topicIndex>=0)) $items[$type.':'.$id]=['id'=>$id,'kind'=>$type,'topicIdx'=>$topicIndex,'itemIdx'=>$index,'topic'=>$topicTitle,'data'=>$node];
            if ($bucket==='topics') {
                foreach (['assignments','quiz','quizzes','activity','activities','performance','performanceTasks','assessments','learning','materials','learningMaterials','handouts','videos','lessons','tasks'] as $child) {
                    if (isset($node[$child])) $walk($node[$child],$child,(int)$index,academicText($node['title']??$node['name']??'',200));
                }
            }
        }
    };
    $walk($subject['topics']??'','topics');$walk($subject['materials']??'','materials');
    return $items;
}
function academicItem(array $subject, array $input): array {
    $items=academicItems($subject);$id=(string)($input['itemId']??$input['assessmentId']??'');
    if ($id!=='' && isset($items['assessment:'.$id])) return $items['assessment:'.$id];
    // Index lookup is permitted only with a matching canonical title, avoiding stale/reordered indices.
    foreach ($items as $item) if ($item['kind']==='assessment' && isset($input['topicIdx'],$input['itemIdx'])
        && $item['topicIdx']===(int)$input['topicIdx'] && $item['itemIdx']===(int)$input['itemIdx']
        && gradeNorm($input['title']??'')===gradeNorm($item['data']['title']??$item['data']['name']??'')) return $item;
    throw new InvalidArgumentException('Save this assessment in the live subject curriculum first.');
}
function academicIsDigitalQuiz(array $item): bool {
    $data=is_array($item['data']??null)?$item['data']:[];
    $types=[];
    foreach(['type','category','materialType','assessmentType','itemType'] as $field){
        $value=strtolower(trim((string)($data[$field]??'')));
        if($value!=='')$types[]=$value;
    }
    // An explicit task/assignment/activity type wins over stale quiz links left
    // behind by older curriculum imports or edits.
    foreach($types as $value)if(preg_match('/\b(task|tasks|assignment|assignments|activity|activities|performance)\b|^pt$/',$value))return false;
    foreach($types as $value)if(str_contains($value,'quiz'))return true;
    return !empty($data['selectedQuizId'])||!empty($data['quizId'])
        ||!empty($data['questions'])||!empty($data['quizQuestions']);
}
function academicKey(string $type,array $subject,array $section,string $student,string $item): string {
    return hash('sha256',json_encode([$type,(string)$subject['id'],(string)$section['id'],$student,$item]));
}
function academicRead(PDO $db,string $type,array $subject,array $section,string $student='',string $item=''): ?array {
    $q=$db->prepare('SELECT payload FROM academic_records WHERE record_key=?'.($db->inTransaction()?' FOR UPDATE':''));$q->execute([academicKey($type,$subject,$section,$student,$item)]);
    return json_decode($q->fetchColumn()?:'null',true);
}
function academicWrite(PDO $db,array $actor,string $type,array $subject,array $section,string $student,string $item,array $payload): void {
    sigmaRequireWritableAcademicSection($db,(string)$section['id']);
    $existing=academicRead($db,$type,$subject,$section,$student,$item);
    if($existing){$comparison=$existing;unset($comparison['recordedAt'],$comparison['gradedAt'],$comparison['gradeRevision']);if($type==='submission'&&($comparison['attemptIdentity']??'')===($payload['attemptIdentity']??''))$payload['submittedAt']=$comparison['submittedAt'];if($comparison==$payload)return;}
    $payload['recordedAt']=gmdate('c');
    if($type==='score'){
        $payload['gradeRevision']=(int)($existing['gradeRevision']??0)+1;
        $payload['gradedAt']=$payload['recordedAt'];
    }
    $q=$db->prepare('INSERT INTO academic_records(record_key,record_type,subject_id,section_id,student_id,item_id,payload,actor_id) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),actor_id=VALUES(actor_id)');
    $q->execute([academicKey($type,$subject,$section,$student,$item),$type,$subject['id'],$section['id'],$student,$item,json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$actor['id']]);
    if(in_array($type,['score','submission','teacher_feedback','release','rubric'],true)){
        require_once __DIR__.'/grade_insight_reports.php';
        sigmaInvalidateGradeReports($db,(string)$subject['id'],(string)$section['id']);
    }
    if($type==='score' && (academicAdmin($actor)||academicRole($actor)==='teacher'||($payload['source']??'')==='quiz-auto')){
        $catalog=academicItems($subject);$assessment=$catalog['assessment:'.$item]??null;
        if($assessment)sigmaPersistGradeNotification($db,$actor,$subject,$section,$student,$assessment,$existing,$payload);
    }
    if($type==='submission' && academicRole($actor)==='student')sigmaPersistSubmissionNotification($db,$actor,$subject,$section,$student,$item,$existing,$payload);
    if($type==='release'&&in_array($item,['learning','assessments'],true)){
        require_once __DIR__.'/coursework_notifications.php';
        sigmaPersistCourseworkReleaseNotices($db,$actor,$subject,$section,$item,$existing??[],$payload);
    }
    $actions=['score'=>'Saved assessment score','submission'=>'Submitted assessment work','release'=>'Updated learning release','attendance'=>'Saved classroom attendance','teacher_feedback'=>'Updated teacher feedback'];
    if(isset($actions[$type]))sigmaRecordActivity($db,(string)$actor['id'],$actions[$type],$type==='attendance'?'Attendance':($type==='score'?'Grades':'Curriculum'),academicText($subject['name'].' / '.$section['name'].($student?' / Student '.$student:''),160));

}
function academicReleaseStudentIds(array $values,array $roster): array {
    $aliases=[];$ids=[];
    foreach($roster as $student){
        $id=(string)$student['id'];$ids[]=$id;
        $names=gradeNames($student);
        $names[]=($student['last_name']??'').', '.($student['first_name']??'');
        $names[]=($student['last_name']??'').', '.trim(($student['first_name']??'').' '.($student['middle_name']??''));
        foreach($names as $name)if(trim($name)!=='')$aliases[gradeNorm($name)]=$id;
        $aliases[gradeNorm('std-'.$id)]=$id;
    }
    $result=[];
    foreach($values as $value){
        if(!is_scalar($value))throw new InvalidArgumentException('Choose students from the current section roster.');
        $key=gradeNorm($value);
        // Keep the all-students choice open-ended so students enrolled later
        // in the section receive already released work too.
        if(in_array($key,['all','*','all students','everyone'],true))return ['*'];
        if(!isset($aliases[$key]))throw new InvalidArgumentException('A selected student is no longer enrolled in this section. Reopen the release panel and select the current roster.');
        $result[]=$aliases[$key];
    }
    return array_values(array_unique($result));
}
function academicReleaseIsAllStudents(array $values): bool {
    foreach($values as $value){
        if(!is_scalar($value))continue;
        if(in_array(gradeNorm($value),['all','*','all students','everyone'],true))return true;
    }
    return false;
}
function academicRelease(PDO $db,array $subject,array $section,array $item,string $student=''): ?array {
    $category=['assessment'=>'assessments','topic'=>'topics','learning'=>'learning'][$item['kind']];
    $config=academicRead($db,'release',$subject,$section,'',$category);if(!$config)return null;
    return academicReleaseFromConfig($config,$item,$student);
}
function academicReleaseFromConfig(array $config,array $item,string $student=''): ?array {
    $category=['assessment'=>'assessments','topic'=>'topics','learning'=>'learning'][$item['kind']];
    $id=$item['id'];$ids=$config[$category==='topics'?'releasedTopicIds':'releasedMaterialIds']??[];
    $hidden=$config[$category==='topics'?'hiddenTopicIds':'hiddenMaterialIds']??[];
    if ((!in_array($id,array_map('strval',$ids),true)&&empty($config['publishAll'])) || in_array($id,array_map('strval',$hidden),true)) return null;
    $scheduled=$config[$category==='topics'?'topicSchedules':'materialSchedules'][$id]??null;
    if(is_string($scheduled)&&academicTime($scheduled)>time())return null;
    $end=$config[$category==='topics'?'topicEndSchedules':($category==='assessments'?'assessmentEndSchedules':'materialEndSchedules')][$id]??$config['materialEndSchedules'][$id]??null;
    $assigned=$config['assignedStudents'][$id]??[];
    if($student && $assigned && !academicReleaseIsAllStudents($assigned) && !in_array($student,array_map('strval',$assigned),true))return null;
    return ['releasedAt'=>$config[$category==='topics'?'topicReleaseDates':'materialReleaseDates'][$id]??$config['recordedAt']??null, 'dueAt'=>is_string($end)?$end:null];
}
function academicResolvedItem(PDO $db,array $subject,array $section,array $item,?array $config=null): array {
    $config=$config??academicRead($db,'release',$subject,$section,'','assessments')??[];$id=$item['id'];
    foreach(['assessmentActivityComponents'=>'component','assessmentWeights'=>'weight','assessmentLatePermissions'=>'latePermission','assessmentGradingModes'=>'gradingMode','assessmentHasTimers'=>'hasTimer','assessmentTimeLimitMinutes'=>'timeLimitMinutes','assessmentTimeLimits'=>'timeLimit','assessmentAutoSubmitOnExit'=>'autoSubmitOnExit','assessmentAllowFileUploads'=>'allowFileUpload','assessmentMaxAttempts'=>'maxAttempts','assessmentMaxScores'=>'maxScore','assessmentRubricUrls'=>'rubricUrl','assessmentRubrics'=>'rubricName','assessmentCriteriaAiAuto'=>'criteriaAiAuto','assessmentSelectedCriteria'=>'selectedCriteria','assessmentAiAssisted'=>'aiAssisted'] as $map=>$field)if(isset($config[$map][$id]))$item['data'][$field]=$config[$map][$id];
    return $item;
}
function academicMaximum(array $item): ?float {
    foreach(['maxScore','max','maxPoints','totalPoints','points','hps','totalScore'] as $field)if(is_numeric($item['data'][$field]??null)&&$item['data'][$field]>0)return (float)$item['data'][$field];
    return null;
}

function academicStudentActivityAreas(array $areas): array {
    $areas['released-learning']=[];
    $areas['learning-follow-up']=array_values(array_filter($areas['learning-follow-up']??[],fn($row)=>!empty(array_filter($row['teacherFeedback']??[],fn($text)=>trim((string)$text)!==''))));
    // Receipt and grading workload are not student learning evidence.
    foreach($areas['learning-follow-up'] as &$record)unset($record['submittedCount'],$record['awaitingTeacherGrade'],$record['status'],$record['dueAt']);
    unset($record);
    return $areas;
}
/** All numeric and workflow evidence is selected from authorized server records. Client snapshots supply selectors only. */
function academicSnapshot(PDO $db,array $actor,array $input,bool $fullGradeEvidence=false): array {
    $kind=academicRole($actor);if(!in_array($kind,['teacher','student'],true))throw new RuntimeException('Learning insights are available in the student and teacher portals.');
    $selector=$input['snapshot']??[];$feature=$input['feature']??'analytics';$grade=$feature==='grade_insights';
    $permission=$kind==='student'?'studentGrades':'teacherGrades';
    $subjects=$db->query('SELECT * FROM subjects WHERE is_deleted=0')->fetchAll();
    $sections=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll();
    $requested=$selector['areas'][0]['records'][0]??[];
    $scope=$grade?($selector['scope']??'overall'):'dashboard';
    $subjectSelector=(string)($requested['subjectId']??$requested['subject']??'');
    $sectionSelector=(string)($requested['sectionId']??$requested['section']??'');
    if($grade && $scope!=='overall' && !$subjectSelector)throw new InvalidArgumentException('Choose a subject for this insight.');
    if($grade && !sigmaActorPermission($actor,$permission))throw new RuntimeException('Grade access is disabled for this account.');
    $areas=['learning-results'=>[],'released-learning'=>[],'learning-follow-up'=>[],'attendance-review'=>[]];
    $q=$db->query('SELECT * FROM grade_publications');$publications=$q->fetchAll();
    $studentPublishedAssignments=$grade&&$kind==='student'?academicStudentPublishedGradeAssignments($publications,$actor,$subjects,$sections):[];
    $students=$kind==='teacher'?$db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student'")->fetchAll():[$actor];
    foreach($subjects as $subject)foreach($sections as $section){
        if(sigmaSyntheticRecordPath($subject)||sigmaSyntheticRecordPath($section)||!academicSectionSubjects($section,$subject))continue;
        // A released quarterly grade remains visible even if curriculum is now a draft.
        if(!$grade&&$kind==='student'&&strtolower($subject['status']??'')!=='published')continue;
        $studentInRoster=$kind==='student'&&gradeStudent($section,$actor);
        $studentHasPublishedGrade=$kind==='student'&&$grade&&!empty($studentPublishedAssignments[(string)$subject['id'].':'.(string)$section['id']]);
        if($kind==='teacher'&&!academicTeacher($section,$actor,$subject))continue;
        if($kind==='student'&&!$studentInRoster&&!$studentHasPublishedGrade)continue;
        if($grade && $scope!=='overall' && !in_array(gradeNorm(preg_replace('/^(card|subj|gen)[-_]/i','',$subjectSelector)),academicAliases($subject),true))continue;
        if($grade && $sectionSelector && !in_array(gradeNorm($sectionSelector),[gradeNorm($section['id']),gradeNorm($section['name'])],true))continue;
        $roster=$kind==='student'?[$actor]:array_values(array_filter($students,fn($student)=>gradeStudent($section,$student)));
        $base=['subjectId'=>(string)$subject['id'],'sectionId'=>(string)$section['id'],'subject'=>$subject['name'],'section'=>$section['name'],'gradeLevel'=>(string)($section['grade_level']??$section['grade']??''),'schoolYear'=>$section['school_year'],
            'internalUrl'=>$kind==='teacher'?'teacher.html#grades:gradebook':'student.html#nav-courses'];
        $items=academicItems($subject);$series=[];
        $q=$db->prepare('SELECT * FROM academic_records WHERE subject_id=? AND section_id=? ORDER BY updated_at DESC');$q->execute([$subject['id'],$section['id']]);$records=$q->fetchAll();
        $byRecord=[];foreach($records as $record)$byRecord[$record['record_type']][(string)$record['student_id']][(string)$record['item_id']]=json_decode($record['payload'],true)?:[];
        $releaseConfigs=[];
        foreach($records as $record)if($record['record_type']==='release' && !$record['student_id'])$releaseConfigs[$record['item_id']]=json_decode($record['payload'],true)?:[];
        if(!$grade && $kind==='teacher' && sigmaActorPermission($actor,'teacherAttendance')){
            $pattern=academicAttendancePattern($records,$roster);
            if($pattern)$areas['attendance-review'][]=$base+$pattern;
        }
        foreach($items as $item){
            $item=academicResolvedItem($db,$subject,$section,$item,$releaseConfigs['assessments']??[]);
            $category=['assessment'=>'assessments','topic'=>'topics','learning'=>'learning'][$item['kind']];
            $release=academicReleaseFromConfig($releaseConfigs[$category]??[],$item,$kind==='student'?$actor['id']:'');
            if(!$release)continue;
            $detail=$item['data'];$title=academicText($detail['title']??$detail['name']??'',200);
            if(!$title)continue;
            $quarter=(int)preg_replace('/\D/','',(string)($detail['quarter']??1));
            if($grade && isset($selector['quarter']) && is_numeric($selector['quarter']) && (int)$selector['quarter']!==$quarter)continue;
            $common=$base+['id'=>$item['kind'].':'.$subject['id'].':'.$section['id'].':'.$item['id'],'title'=>$title,'topic'=>$item['topic'],'instructions'=>academicText($detail['instructions']??$detail['description']??'',600),'quarter'=>$quarter];
            if(!$grade && sigmaActorPermission($actor,$kind==='teacher'?'teacherMaterials':'studentGrades')){
                $areas['released-learning'][]=$common+$release+['description'=>academicText($detail['instructions']??$detail['description']??''),'allowedCategories'=>['descriptive','prescriptive']];
            }
            if($item['kind']!=='assessment'||!sigmaActorPermission($actor,$permission))continue;
            $scores=[];$submissions=0;$ungraded=0;$feedback=[];$max=academicMaximum($item);$dates=[];$cohort=[];
            foreach($roster as $student){
                $submission=$byRecord['submission'][(string)$student['id']][(string)$item['id']]??null;
                $score=$byRecord['score'][(string)$student['id']][(string)$item['id']]??null;
                if($submission)$submissions++;
                if($submission && (!isset($score['score'])||$score['score']===null||($score['attemptIdentity']??'')!==($submission['attemptIdentity']??'')))$ungraded++;
                $scoreMax=is_numeric($score['maxScore']??null)&&$score['maxScore']>0?(float)$score['maxScore']:$max;
                if($score && (!$submission || ($score['attemptIdentity']??'')===($submission['attemptIdentity']??'')) && is_numeric($score['score']??null)&&$scoreMax&&$score['score']>=0&&$score['score']<=$scoreMax){$scores[]=round(100*$score['score']/$scoreMax,2);$dates[]=substr($score['recordedAt'],0,10);$cohort[]=$student['id'];}
                $teacherNote=$byRecord['teacher_feedback'][(string)$student['id']][(string)$item['id']]??null;
                if($teacherNote && $submission && ($teacherNote['attemptIdentity']??'')===$submission['attemptIdentity'])$feedback[]=academicText($teacherNote['text'],600);
                if($score && !empty($score['feedback']))$feedback[]=academicText($score['feedback'],600);
            }
            if($scores){
                $record=$common+['assessmentCount'=>1,'gradedCount'=>count($scores),'rosterCount'=>count($roster),'averagePercent'=>round(array_sum($scores)/count($scores),2),'date'=>max($dates),'teacherFeedback'=>array_slice($feedback,0,4),'allowedCategories'=>['descriptive','prescriptive']];
                if($kind==='student')$record+=['score'=>(float)$score['score'],'maximumScore'=>$scoreMax];
                $areas['learning-results'][]=$record;sort($cohort);$series[$quarter.':'.gradeNorm($detail['type']??$detail['category']??'assessment').':'.hash('sha256',json_encode($cohort))][]=$record;
            }
            if(!$grade && $kind==='student' && !$submissions && !empty($release['dueAt']) && academicTime($release['dueAt'])>0 && academicTime($release['dueAt'])<time())$areas['learning-follow-up'][]=$common+['dueAt'=>$release['dueAt'],'status'=>'No saved submission after the assigned deadline; verify with teacher if submitted elsewhere.','allowedCategories'=>['descriptive','prescriptive']];
            if(!$grade && ($submissions||$feedback) && ($ungraded||$feedback||$kind==='student')) $areas['learning-follow-up'][]=$common+['submittedCount'=>$submissions,'awaitingTeacherGrade'=>$ungraded,'teacherFeedback'=>array_slice($feedback,0,4),'allowedCategories'=>['descriptive','prescriptive']];
        }
        // Comparable dated assessment percentages, same subject/section/year/quarter. Class coverage excludes tiny or partial samples.
        foreach($series as $quarter=>$points){
            $eligible=array_values(array_filter($points,fn($point)=>$kind==='student'||($point['rosterCount']>=5 && $point['gradedCount']>=5 && $point['gradedCount']/$point['rosterCount']>=0.6)));
            if(count($eligible)>=3 && count(array_unique(array_column($eligible,'date')))>=2){
                usort($eligible,fn($a,$b)=>strcmp($a['date'],$b['date']));
                $areas['learning-results'][]=$base+['id'=>'trend:'.$subject['id'].':'.$section['id'].':'.$quarter,'quarter'=>(int)$quarter,'observations'=>array_map(fn($p)=>array_intersect_key($p,array_flip(['id','title','date','averagePercent','gradedCount','rosterCount'])),array_slice($eligible,-12)),
                    'allowedCategories'=>['predictive','descriptive','prescriptive'],'predictionLimit'=>'Tentative performance direction only; no guaranteed future score, diagnosis, or failure label.'];
            }
        }
        if(!sigmaActorPermission($actor,$permission))continue;
        $quarterEvidence=[];
        foreach($publications as $publication){
            $s=json_decode($publication['scope_json'],true);if(!$s||!gradeScopeYearMatches($s[0]??'',$section['school_year']??'')||!academicSectionScopeMatches($section,$s[1]??'')||!academicSubjectScopeMatches($section,$subject,$s[2]??''))continue;
            if($kind==='student' && $publication['kind']!=='published')continue;
            if($grade && is_numeric($selector['quarter']??null) && (int)$selector['quarter']!==(int)$s[3])continue;
            if($kind==='teacher' && $publication['kind']==='published'){
                $hasShared=false;foreach($publications as $other)if($other['record_key']===$publication['record_key']&&$other['kind']==='shared'){$hasShared=true;break;}if($hasShared)continue;
            }
            $payload=json_decode($publication['payload'],true);$grades=[];$named=[];
            foreach($payload['rows']??[] as $row){
                if(!is_numeric($row['grade']??null)||$row['grade']<0||$row['grade']>100)continue;
                $ids=array_map('strval',array_merge([$row['id']??''],$row['studentIds']??[]));
                foreach($roster as $student)if(in_array((string)$student['id'],$ids,true)){
                    $grades[]=(float)$row['grade'];
                    $named[]=['id'=>(string)$student['id'],'name'=>academicText($student['full_name']??trim(($student['first_name']??'').' '.($student['last_name']??'')),160),'grade'=>(float)$row['grade']];break;
                }
            }
            if(!$grades)continue;
            $quarterEvidence[(int)$s[3]]=true;
            $record=$base+['id'=>'quarter:'.$publication['record_key'].':'.$publication['kind'],'quarter'=>(int)$s[3],'grade'=>round(array_sum($grades)/count($grades),2),'studentCount'=>count($grades),'gradeStatus'=>$publication['kind'],'date'=>$payload['publishedAt']??$payload['submittedAt']??'', 'allowedCategories'=>['descriptive','prescriptive']];
            if($grade&&$kind==='teacher')$record['students']=$named;
            $areas['learning-results'][]=$record;
        }
        if($grade&&$kind==='teacher'){
            // Before first sharing, use the same durable quarter drafts as the gradebook.
            $draftQuery=$db->prepare('SELECT record_key,scope_json,payload FROM grade_drafts WHERE owner_id=?');$draftQuery->execute([$actor['id']]);
            foreach($draftQuery->fetchAll(PDO::FETCH_ASSOC) as $draft){
                $s=json_decode($draft['scope_json'],true);$q=(int)($s[3]??0);
                if(!$s||isset($quarterEvidence[$q])||!gradeScopeYearMatches($s[0]??'',$section['school_year']??'')||!academicSectionScopeMatches($section,$s[1]??'')||!academicSubjectScopeMatches($section,$subject,$s[2]??''))continue;
                if(is_numeric($selector['quarter']??null)&&(int)$selector['quarter']!==$q)continue;
                $payload=json_decode($draft['payload'],true);$named=[];
                foreach($payload['rows']??[] as $row)foreach($roster as $student)if((string)$student['id']===(string)($row['id']??'')&&is_numeric($row['grade']??null)&&$row['grade']>=0&&$row['grade']<=100){
                    $named[]=['id'=>(string)$student['id'],'name'=>academicText($student['full_name']??trim(($student['first_name']??'').' '.($student['last_name']??'')),160),'grade'=>(float)$row['grade']];break;
                }
                if($named)$areas['learning-results'][]=$base+['id'=>'draft:'.$draft['record_key'],'quarter'=>$q,'grade'=>round(array_sum(array_column($named,'grade'))/count($named),2),'studentCount'=>count($named),'students'=>$named,'gradeStatus'=>'draft','date'=>$payload['updatedAt']??'','allowedCategories'=>['descriptive','prescriptive']];
            }
        }
    }
    // Curriculum availability alone is not evidence of student activity.
    if (!$grade && $kind==='student') {
        $areas=academicStudentActivityAreas($areas);
    }
    $result=[];
    if($grade){
        $id=$scope==='subject'?'subject-grades':($kind==='teacher'?'class-grades':'overall-grades');
        // Overall student grades exclude raw activity scores, as on the actual Grades page.
        $rows=$areas['learning-results'];if($kind==='student'&&$scope==='overall'&&!$fullGradeEvidence)$rows=array_values(array_filter($rows,fn($r)=>isset($r['grade'])));
        if($rows)$result[]=['id'=>$id,'records'=>array_values($rows)];
    }else foreach($areas as $id=>$rows)if($rows){
        // Prioritize trends and recent facts, with bounded provider context.
        usort($rows,fn($a,$b)=>(isset($b['observations'])<=>isset($a['observations'])) ?: strcmp($b['date']??$b['releasedAt']??'',$a['date']??$a['releasedAt']??''));
        $result[]=['id'=>$id,'records'=>$kind==='student'?sigmaSelectStudentInsightRecords($rows,12):array_slice($rows,0,12)];
    }
    return [$kind.'Id'=>(string)$actor['id'],'scope'=>$scope,'asOf'=>academicDay(),'areas'=>$result,'evidenceVersion'=>2,'insightPolicyVersion'=>$kind==='student'?SIGMA_STUDENT_INSIGHT_POLICY:1]+($grade?['gradeReportPolicyVersion'=>6]:[])+['rules'=>[
        'No grade or attendance is inferred from blank records. Unmarked attendance is not absence. A pending grade is teacher workflow, not student failure.',
        'A submission, download or release is not proof of learning or mastery. Topic-specific advice needs the cited actual topic or rubric.',
        'Do not diagnose ability, personality, health, motivation, or predict exact future grades. No ranking or comparison with named classmates.',
        'Predictive category requires a cited trend record with allowedCategories containing predictive. Ordinary quarterly grades alone are not a forecast.',
        'Summarize recent activity only on supplied dates. No activity or unchanged evidence means no new daily summary. Do not claim anything happened today unless the evidence date is today.',
        'Use a reflective question occasionally only when it helps the next learning action; do not repeat reminders or questions in every card.'
    ]];
}
