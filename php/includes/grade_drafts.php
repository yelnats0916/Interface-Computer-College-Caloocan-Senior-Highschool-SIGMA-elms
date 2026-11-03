<?php
require_once __DIR__.'/academic_scope.php';
require_once __DIR__.'/role_permissions.php';

/** Private draft snapshots never submit or publish grades. */
function sigmaEnsureGradeDraftSchema(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS grade_drafts (record_key CHAR(64) NOT NULL PRIMARY KEY,owner_id VARCHAR(50) NOT NULL,scope_json TEXT NOT NULL,payload LONGTEXT NOT NULL,revision INT NOT NULL DEFAULT 1,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,INDEX idx_grade_drafts_owner(owner_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function sigmaGradeDraftRows(array $actor, array $section, array $scope, array $rows, array $students, array $subjects = [], bool $sectionResolvedById = false): array {
    if (count($scope)!==4 || !is_int($scope[3]) || $scope[3]<1 || $scope[3]>4
        || !gradeScopeYearMatches($scope[0]??'', $section['school_year']??'')
        || (!$sectionResolvedById && !gradeScopeSectionMatches($section, $scope[1]??''))) throw new InvalidArgumentException('Invalid draft quarter or class.');
    $role=preg_replace('/[\s_-]+/','',strtolower($actor['role']??''));
    $admin=in_array($role,['admin','masteradmin','administrator'],true);
    if (!$admin && !($role==='teacher' && sigmaActorPermission($actor,'teacherGrades') && gradeTeacher($section,$actor,(string)$scope[2],$subjects))) throw new RuntimeException('Only the assigned subject teacher can update this grade draft.');
    if (!$rows || count($rows)>500) throw new InvalidArgumentException('No valid student draft grades were provided.');
    $byId=[];foreach($students as $student)$byId[(string)$student['id']]=$student;
    $clean=[];$seen=[];
    foreach($rows as $row){
        if(!is_array($row))throw new InvalidArgumentException('Invalid draft grade row.');
        $id=(string)($row['id']??'');$student=$byId[$id]??null;
        if(!$student || !gradeStudent($section,$student))throw new RuntimeException('A student is no longer assigned to this section. Refresh the roster before continuing.');
        if(isset($seen[$id]) || !array_key_exists('grade',$row))throw new InvalidArgumentException('Each student must have one draft grade.');
        $grade=$row['grade'];
        if($grade!==null && (!is_numeric($grade)||!is_finite((float)$grade)||$grade<0||$grade>100))throw new InvalidArgumentException('A draft grade must be blank or between 0 and 100.');
        $seen[$id]=true;
        $name=$student['full_name']??trim(implode(' ',array_filter([$student['first_name']??'',$student['middle_name']??'',$student['last_name']??''])));
        $clean[]=['id'=>$id,'name'=>$name,'grade'=>$grade===null?null:(float)$grade];
    }
    return $clean;
}

function sigmaReadGradeDrafts(PDO $db, string $owner): array {
    $query=$db->prepare('SELECT scope_json,payload,revision FROM grade_drafts WHERE owner_id=?');$query->execute([$owner]);
    $drafts=[];
    foreach($query->fetchAll(PDO::FETCH_ASSOC) as $row){
        $record=json_decode($row['payload'],true);if(!is_array($record))continue;
        $record['revision']=(int)$row['revision'];$drafts[$row['scope_json']]=$record;
    }
    return $drafts;
}

function sigmaSaveGradeDraft(PDO $db, string $owner, array $scope, array $rows, string $sectionId = ''): array {
    if($owner==='')throw new RuntimeException('A signed-in account is required to save a grade draft.');
    $scopeJson=json_encode($scope,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $key=hash('sha256',$owner.'|'.$scopeJson);
    $record=['rows'=>$rows,'updatedAt'=>(new DateTimeImmutable('now',new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.u\Z'),'updatedBy'=>$owner,'quarter'=>$scope[3]];
    if ($sectionId !== '') $record['sectionId'] = $sectionId;
    $sql='INSERT INTO grade_drafts(record_key,owner_id,scope_json,payload) VALUES(?,?,?,?)';
    $sql.=$db->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite'
        ? ' ON CONFLICT(record_key) DO UPDATE SET payload=excluded.payload,revision=grade_drafts.revision+1'
        : ' ON DUPLICATE KEY UPDATE payload=VALUES(payload),revision=revision+1';
    $db->prepare($sql)->execute([$key,$owner,$scopeJson,json_encode($record,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    $check=$db->prepare('SELECT payload,revision FROM grade_drafts WHERE record_key=? AND owner_id=?');$check->execute([$key,$owner]);
    $saved=$check->fetch(PDO::FETCH_ASSOC);
    if(!$saved)throw new RuntimeException('The database did not confirm this draft. Please try again.');
    return json_decode($saved['payload'],true,512,JSON_THROW_ON_ERROR)+['revision'=>(int)$saved['revision']];
}
