<?php
require_once __DIR__.'/academic_evidence.php';

/** File references only: archived resource reads never return answers or private feedback. */
function sigmaArchiveFiles(array $node): array {
    $files=[];
    $candidates=[
        ['name'=>$node['fileName']??$node['name']??'','url'=>$node['fileUrl']??$node['fileData']??$node['dataUrl']??$node['url']??'','size'=>$node['fileSize']??$node['size']??'N/A'],
        ['name'=>$node['perfGuidelinesFileName']??'','url'=>$node['perfGuidelinesUrl']??$node['perfGuidelinesFileUrl']??''],
        ['name'=>$node['rubricFileName']??'','url'=>$node['rubricFileUrl']??$node['rubricUrl']??'']
    ];
    if(is_array($node['rubric']??null))$candidates[]=$node['rubric'];
    if(!empty($node['title']))$candidates[]=['name'=>$node['title'],'url'=>$node['fileUrl']??$node['url']??''];
    foreach(['files','attachments','fileList'] as $field)foreach($node[$field]??[] as $file)if(is_array($file))$candidates[]=$file;
    foreach($candidates as $file){
        $name=trim((string)($file['name']??$file['fileName']??''));$url=$file['fileUrl']??$file['url']??$file['dataUrl']??'';
        if(!is_string($url)||$url===''||!preg_match('/\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i',$name,$match))continue;
        $ext=strtolower($match[1]);$type=str_starts_with($ext,'doc')?'docx':(str_starts_with($ext,'ppt')?'pptx':(in_array($ext,['mov','mp4'],true)?'video':(in_array($ext,['zip','rar'],true)?'zip':'pdf')));
        $files[$name.'|'.$url]=['title'=>$name,'fileUrl'=>$url,'type'=>$type,'size'=>$file['size']??$file['fileSize']??'N/A'];
    }
    foreach($node['attempts']??[] as $attempt)if(is_array($attempt))foreach(sigmaArchiveFiles($attempt) as $file)$files[$file['title'].'|'.$file['fileUrl']]=$file;
    return array_values($files);
}

function sigmaArchiveResourceRows(array $snapshot,array $actor): array {
    $section=$snapshot['section'];$year=$snapshot['year'];$rows=[];$role=academicRole($actor);
    $student=$role==='student';$admin=academicAdmin($actor);
    if(!$admin&&$role!=='teacher'&&!$student)return [];
    if($student&&!gradeStudent($section,$actor))return [];
    foreach($snapshot['entries'] as $entry){
        $subject=$entry['subject'];
        if(!$admin&&!$student&&!academicTeacher($section,$actor,$subject))continue;
        $base=['schoolYear'=>$year['year_start'].'-'.$year['year_end'],'subject'=>$subject['name'],'subjectCode'=>$subject['code']??'',
            'sectionName'=>$section['name'],'sectionId'=>(string)$section['id'],'readOnly'=>true,'isArchived'=>true,'sharedWithStudents'=>true];
        foreach(academicItems($subject) as $item){
            $category=['topic'=>'topics','learning'=>'learning','assessment'=>'assessments'][$item['kind']];
            $config=$entry['releases'][$category]??[];
            if($student){
                if(strtolower($subject['status']??'')!=='published'||!academicReleaseFromConfig($config,$item,(string)$actor['id']))continue;
                $scheduled=$config[$category==='topics'?'topicSchedules':'materialSchedules'][$item['id']]??null;
                if(is_string($scheduled)&&academicTime($scheduled)>($snapshot['capturedAt']??0))continue;
                if(($item['data']['sharedWithStudents']??true)===false)continue;
            }
            foreach(sigmaArchiveFiles($item['data']) as $file){
                $node=$item['data'];
                $rows[]=array_merge($base,$file,['id'=>'archive-'.hash('sha256',$year['id'].'|'.$section['id'].'|'.$subject['id'].'|'.$item['id'].'|'.$file['fileUrl']),
                    'rawMaterialId'=>$item['id'],'materialTitle'=>$node['title']??$node['name']??$item['topic'],
                    'quarter'=>$node['quarter']??'1st Quarter','category'=>$node['category']??'Handout',
                    'author'=>$node['authorName']??$node['author']??'Instructor','sourceAuthorId'=>$node['authorId']??'',
                    'date'=>$node['createdAt']??'','description'=>'Archived resource: '.($node['title']??$node['name']??$subject['name'])]);
            }
        }
        foreach($entry['submissions']??[] as $submission){
            if($student&&(string)$submission['student_id']!==(string)$actor['id'])continue;
            $data=json_decode($submission['payload'],true)?:[];
            foreach(sigmaArchiveFiles($data) as $file)$rows[]=array_merge($base,$file,[
                'id'=>'archive-sub-'.hash('sha256',$year['id'].'|'.$section['id'].'|'.$subject['id'].'|'.$submission['student_id'].'|'.$submission['item_id'].'|'.$file['fileUrl']),
                'isStudentSubmission'=>true,'studentId'=>(string)$submission['student_id'],'materialTitle'=>$data['title']??'Submitted coursework',
                'quarter'=>$data['quarter']??'1st Quarter','category'=>'Handout','author'=>$submission['full_name']??$submission['student_id'],
                'date'=>$data['submittedAt']??'','description'=>'Archived student submission']);
        }
    }
    return $rows;
}

function sigmaSchoolYearResourceHistory(PDO $db,array $actor): array {
    $rows=[];
    try{$snapshots=$db->query('SELECT a.payload FROM school_year_resource_archives a JOIN school_years y ON y.id=a.year_id WHERE y.is_deleted=0')->fetchAll(PDO::FETCH_COLUMN);}
    catch(PDOException $error){if($error->getCode()==='42S02')return [];throw $error;}
    foreach($snapshots as $json){$snapshot=json_decode($json,true,64,JSON_THROW_ON_ERROR);$rows=array_merge($rows,sigmaArchiveResourceRows($snapshot,$actor));}
    return $rows;
}
