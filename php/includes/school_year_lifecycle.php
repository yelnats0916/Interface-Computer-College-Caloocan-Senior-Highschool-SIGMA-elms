<?php
require_once __DIR__.'/school_year_policy.php';
require_once __DIR__.'/maintenance_policy.php';
require_once __DIR__.'/academic_evidence.php';
require_once __DIR__.'/activity_audit.php';

/** Run schema setup before starting the lifecycle transaction (MySQL DDL commits). */
function sigmaEnsureSchoolYearArchives(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS school_year_resource_archives (
        year_id VARCHAR(64) NOT NULL, section_id VARCHAR(64) NOT NULL,
        payload LONGTEXT NOT NULL, archived_at DATETIME NOT NULL,
        PRIMARY KEY(year_id,section_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function sigmaSchoolYearSections(PDO $db,array $year): array {
    $sections=[];
    $lock=$db->prepare('SELECT * FROM sections WHERE id=? FOR UPDATE');
    foreach($db->query('SELECT id,school_year FROM sections ORDER BY id')->fetchAll(PDO::FETCH_ASSOC) as $reference){
        if(!sigmaSchoolYearReferenceMatches((string)$reference['school_year'],$year))continue;
        $lock->execute([$reference['id']]);$section=$lock->fetch(PDO::FETCH_ASSOC);
        if($section)$sections[]=$section;
    }
    return $sections;
}

/** Preserve file references, curriculum, releases and original assignments without moving files. */
function sigmaSnapshotSchoolYearResources(PDO $db,array $year,array $sections): void {
    $subjects=$db->query('SELECT * FROM subjects WHERE is_deleted=0')->fetchAll(PDO::FETCH_ASSOC);
    $save=$db->prepare('INSERT INTO school_year_resource_archives(year_id,section_id,payload,archived_at) VALUES(?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE payload=VALUES(payload),archived_at=VALUES(archived_at)');
    foreach($sections as $section){
        if(!empty($section['is_deleted']))continue;
        $entries=[];
        foreach($subjects as $subject){
            if(!academicSectionSubjects($section,$subject))continue;
            $releases=[];
            foreach(['topics','learning','assessments'] as $category)$releases[$category]=academicRead($db,'release',$subject,$section,'',$category)??[];
            $submissions=$db->prepare("SELECT r.student_id,r.item_id,r.payload,u.full_name FROM academic_records r LEFT JOIN users u ON u.id=r.student_id WHERE r.record_type='submission' AND r.subject_id=? AND r.section_id=?");
            $submissions->execute([$subject['id'],$section['id']]);
            $entries[]=['subject'=>$subject,'releases'=>$releases,'submissions'=>$submissions->fetchAll(PDO::FETCH_ASSOC)];
        }
        $save->execute([(string)$year['id'],(string)$section['id'],json_encode(['year'=>$year,'section'=>$section,'entries'=>$entries,'capturedAt'=>time()],JSON_THROW_ON_ERROR)]);
    }
}

function sigmaRevokeNonMasterSessions(PDO $db): void {
    foreach(['grade_sync_tokens','application_login_challenges','service_vault_sessions','application_presence'] as $table){
        try {
            $db->exec("DELETE s FROM `$table` s JOIN users u ON u.id=s.user_id WHERE LOWER(REPLACE(REPLACE(REPLACE(u.role,' ',''),'-',''),'_',''))<>'masteradmin'");
        } catch(PDOException $error){if($error->getCode()!=='42S02')throw $error;}
    }
}

/** Caller owns the school-year write lock and transaction. */
function sigmaTransitionSchoolYear(PDO $db,array $actor,string $id,string $action,?string $expectedStatus=null): array {
    if(academicRole($actor)!=='masteradmin')throw new RuntimeException('Only Master Administrators can archive or reactivate school years.');
    $find=$db->prepare('SELECT * FROM school_years WHERE id=? AND is_deleted=0 FOR UPDATE');$find->execute([$id]);
    $year=$find->fetch(PDO::FETCH_ASSOC);
    if(!$year)throw new DomainException('School year not found. Refresh the list and try again.');
    if($expectedStatus!==null&&$year['status']!==$expectedStatus)throw new DomainException('This school year changed since confirmation. Refresh and review the action again.');
    $archiving=$action==='archive';
    if(!$archiving&&$action!=='reactivate')throw new InvalidArgumentException('Invalid school-year transition.');
    if($archiving&&$year['status']==='Completed (Archived)')throw new DomainException('This school year is already archived.');
    if(!$archiving&&$year['status']!=='Completed (Archived)')throw new DomainException('Only an archived school year can be reactivated.');
    $sections=sigmaSchoolYearSections($db,$year);
    $maintenance=null;
    if(!$archiving||$year['status']==='Active'){
        $db->query('SELECT id FROM system_service_settings WHERE id=1 FOR UPDATE');
        $settings=loadServiceSettings();
        $config=$settings['maintenance']??[];
        $config['enabled']=true;$config['masterOnly']=true;
        $config['message']='The portal is under maintenance while the Master Admin prepares the academic year. Please try again later.';
        $config['updatedAt']=gmdate('c');$config['updatedBy']=(string)$actor['id'];
        $settings['maintenance']=$config;
        if(!saveServiceSettings($settings))throw new RuntimeException('Maintenance could not be enabled.');
        sigmaRevokeNonMasterSessions($db);
        $maintenance=sigmaMaintenanceState($config);
    }
    if($archiving){
        sigmaSnapshotSchoolYearResources($db,$year,$sections);
        $db->prepare("UPDATE school_years SET status='Completed (Archived)',archived_at=UTC_TIMESTAMP() WHERE id=?")->execute([$id]);
    }else{
        $db->exec("UPDATE school_years SET status='Inactive' WHERE status='Active'");
        $db->prepare("UPDATE school_years SET status='Active',archived_at=NULL WHERE id=?")->execute([$id]);
    }
    $count=0;
    $update=$db->prepare('UPDATE sections SET status=? WHERE id=?');
    foreach($sections as $section){
        if(!$archiving&&strtolower($section['status'])!=='archived')continue;
        $update->execute([$archiving?'Archived':'Draft',$section['id']]);
        if(empty($section['is_deleted']))$count++;
    }
    sigmaRecordActivity($db,(string)$actor['id'],$archiving?'Archived School Year':'Reactivated School Year','System',
        'School year '.$year['year_start'].'-'.$year['year_end'].' | '.$count.' sections '.($archiving?'archived':'returned to Draft'),
        ['schoolYearId'=>$id,'sectionsCount'=>$count,'maintenanceEnabled'=>$maintenance!==null]);
    return ['success'=>true,'sectionsCount'=>$count,'maintenance'=>$maintenance,'message'=>$archiving?'School year and its sections archived.':'School year reactivated. Its archived sections are now Draft.'];
}
