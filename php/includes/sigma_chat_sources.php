<?php
require_once __DIR__.'/academic_evidence.php';
require_once __DIR__.'/sigma_learning_files.php';

function sigmaChatAssessment(array $data): bool {
    if(!empty($data['isAssessment'])||!empty($data['isQuiz']))return true;
    return (bool)preg_match('/quiz|exam|assess|assignment|performance|rubric|answer.?key|submission|activity|worksheet|task\b|test\b/i',
        implode(' ',array_map(fn($key)=>is_scalar($data[$key]??null)?(string)$data[$key]:'',['type','category','title','name','fileName'])));
}
function sigmaChatLearningItems(array $subject): array {
    $result=[];$denied=[];
    $collect=function($nodes,bool $blocked=false)use(&$collect,&$denied){
        foreach(gradeList($nodes) as $node){if(!is_array($node))continue;
            if(($blocked||sigmaChatAssessment($node))&&($ref=sigmaLearningFileReference($node))!=='')$denied[]=sigmaChatFileIdentity($ref);
            if($blocked||sigmaChatAssessment($node))foreach(['fileUrl','url','sourceUrl','rubricUrl','perfRubricUrl','perfGuidelinesUrl'] as $key)if(is_string($node[$key]??null)&&trim($node[$key])!=='')$denied[]=sigmaChatFileIdentity($node[$key]);
            foreach(['assignments','quiz','quizzes','activity','activities','performance','performanceTasks','assessments','tasks'] as $bucket)if(isset($node[$bucket]))$collect($node[$bucket],true);
            foreach(['materials','learning','lessons','resources','learningMaterials','handouts'] as $bucket)if(isset($node[$bucket]))$collect($node[$bucket],$blocked);
        }
    };
    $collect($subject['topics']??'');$collect($subject['materials']??'');
    $add=function(array $data,string $kind,string $topic,int $index,string $parent='')use(&$result){
        if(!empty($data['isDeleted'])||!empty($data['is_deleted'])||sigmaSyntheticRecordPath($data)||sigmaChatAssessment($data))return;
        $title=academicText($data['title']??$data['name']??'',200);if(!$title)return;
        $id=(string)($data['id']??$data['materialId']??($kind==='topic'?'topic-'.$index:''));if($id==='')return;
        $result[$kind.':'.$id]=['id'=>$id,'kind'=>$kind,'topic'=>$topic,'parent'=>$parent,'data'=>$data];
    };
    foreach(gradeList($subject['topics']??'') as $i=>$topic){
        if(!is_array($topic)||!empty($topic['isDeleted']))continue;
        $title=academicText($topic['title']??$topic['name']??'',200);$add($topic,'topic',$title,(int)$i);
        foreach(['learning','lessons','learningMaterials','handouts','resources','materials'] as $bucket){
            foreach(gradeList($topic[$bucket]??[]) as $j=>$item)if(is_array($item))$add($item,'learning',$title,(int)$j,(string)($topic['id']??'topic-'.$i));
        }
    }
    foreach(gradeList($subject['materials']??'') as $i=>$item)if(is_array($item)&&preg_match('/lesson|handout|resource|learning|document|video/i',(string)($item['type']??$item['category']??'')))$add($item,'learning',academicText($item['topicTitle']??'',200),(int)$i);
    // A learning alias must never reopen a file also attached as an assessment or rubric.
    return array_values(array_filter($result,fn($item)=>!in_array(sigmaChatFileIdentity(sigmaLearningFileReference($item['data'])),$denied,true)));
}
function sigmaChatFileIdentity(string $url): string {
    if(preg_match('~https://(?:drive|docs)\.google\.com/(?:file/d/|document/d/|presentation/d/|.*[?&]id=)([a-zA-Z0-9_-]+)~',$url,$m))return 'drive:'.$m[1];
    return rawurldecode(parse_url($url,PHP_URL_PATH)?:$url);
}
function sigmaChatStaffAssessments(array $actor): bool {
    return in_array(academicRole($actor),['teacher','admin','administrator','masteradmin'],true);
}
function sigmaChatStaffItems(array $subject): array {
    $items=sigmaChatLearningItems($subject);
    foreach(academicItems($subject) as $item){
        if($item['kind']!=='assessment'||preg_match('/submission/i',implode(' ',[(string)($item['data']['type']??''),(string)($item['data']['category']??'')])))continue;
        $items[]=$item;
        foreach(['rubricUrl','perfRubricUrl'] as $field)if(is_string($item['data'][$field]??null)&&trim($item['data'][$field])!==''){
            $rubric=$item;$rubric['id'].=':'.$field;
            $rubric['data']['title']=academicText($item['data']['title']??$item['data']['name']??'Assessment',170).' — Rubric';
            $rubric['data']['fileUrl']=$item['data'][$field];$rubric['data']['url']=$item['data'][$field];
            $items[]=$rubric;
        }
    }
    return $items;
}
function sigmaChatAssessmentText(array $data): string {
    // Only assessment content, never associated submissions, grades, or personal records.
    $fields=['title','name','description','instructions','content','text','questions','answerKey','answers','rubric','criteria','explanation'];
    $allowed=['title','name','description','instructions','content','text','questions','question','prompt','options','choices','answerKey','answers','answer','correctAnswer','correct','explanation','rubric','criteria','levels','points','value','label','type','id','A','B','C','D'];
    $filter=function($value,int $depth=0)use(&$filter,$allowed){
        if($depth>8)return null;
        if(!is_array($value))return is_scalar($value)?$value:null;
        $clean=[];foreach(array_slice($value,0,100,true) as $key=>$item)if(is_int($key)||in_array((string)$key,$allowed,true))$clean[$key]=$filter($item,$depth+1);
        return $clean;
    };
    $clean=[];foreach($fields as $field)if(isset($data[$field]))$clean[$field]=$filter($data[$field]);
    return academicText(json_encode($clean,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE),12000);
}
function sigmaChatReleased(PDO $db,array $subject,array $section,array $item,array $actor,?array $config=null,?array $parentConfig=null): bool {
    $category=$item['kind']==='topic'?'topics':'learning';
    $config=$config??academicRead($db,'release',$subject,$section,'',$category);if(!$config)return false;
    if(!empty($item['parent'])){
        $parent=$parentConfig??academicRead($db,'release',$subject,$section,'','topics')??[];
        foreach([$item['parent'],$item['topic']] as $id){
            if(in_array($id,array_map('strval',$parent['hiddenTopicIds']??[]),true))return false;
            $schedule=$parent['topicSchedules'][$id]??null;
            if($schedule&&(!academicTime((string)$schedule)||academicTime((string)$schedule)>time()))return false;
            $assigned=$parent['assignedStudents'][$id]??[];
            if($assigned&&!in_array((string)$actor['id'],array_map('strval',$assigned),true))return false;
        }
    }
    $data=$item['data'];$aliases=array_map('strval',array_filter([$item['id'],$data['title']??'',$data['name']??'']));
    $released=$config[$category==='topics'?'releasedTopicIds':'releasedMaterialIds']??[];
    $hidden=$config[$category==='topics'?'hiddenTopicIds':'hiddenMaterialIds']??[];
    if(!array_intersect($aliases,array_map('strval',$released))||array_intersect($aliases,array_map('strval',$hidden)))return false;
    foreach($aliases as $id){
        $assigned=$config['assignedStudents'][$id]??[];
        if($assigned&&!in_array((string)$actor['id'],array_map('strval',$assigned),true))return false;
        $time=$config[$category==='topics'?'topicSchedules':'materialSchedules'][$id]??null;
        if($time&&(!academicTime((string)$time)||academicTime((string)$time)>time()))return false;
    }
    return true;
}
function sigmaChatCatalog(PDO $db,array $actor): array {
    $role=academicRole($actor);$catalog=[];
    $sections=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status) NOT IN ('archived','draft','deleted')")->fetchAll();
    foreach($db->query('SELECT * FROM subjects WHERE is_deleted=0')->fetchAll() as $subject){
        if(sigmaSyntheticRecordPath($subject)||($role==='student'&&strtolower($subject['status']??'')!=='published'))continue;
        $items=sigmaChatStaffAssessments($actor)?sigmaChatStaffItems($subject):sigmaChatLearningItems($subject);
        $subjectSections=array_values(array_filter($sections,fn($section)=>academicSectionSubjects($section,$subject)&&!sigmaSyntheticRecordPath($section)));
        if(!$subjectSections&&sigmaChatStaffAssessments($actor))$subjectSections[]=['id'=>'','name'=>'School curriculum','students'=>'[]'];
        $subjectName=academicText($subject['name']??'',150);
        $subjectCode='';
        foreach(['code','subject_code','subjectCode','abbreviation','subject_abbreviation'] as $field){
            if(is_string($subject[$field]??null)&&trim($subject[$field])!==''){$subjectCode=academicText($subject[$field],80);break;}
        }
        $codeParts=preg_split('/[^\pL\pN]+/u',mb_strtolower($subjectCode))?:[];
        $codeAliases=array_values(array_filter($codeParts,fn($part)=>preg_match('/^\pL{2,12}$/u',$part)));
        $nameParts=preg_split('/[^\pL\pN]+/u',mb_strtolower($subjectName))?:[];
        $nameParts=array_values(array_filter($nameParts,fn($part)=>$part!==''&&!in_array($part,['and','of','the','for','in','to','with'],true)));
        $acronym=mb_strtoupper(implode('',array_map(fn($part)=>mb_substr($part,0,1),$nameParts)));
        $subjectAliases=array_values(array_unique(array_filter(array_merge([$subjectCode,$acronym],$codeAliases),fn($alias)=>$alias!==''&&mb_strtolower($alias)!==mb_strtolower($subjectName))));
        foreach($subjectSections as $section){
            $enrolled=false;
            foreach(gradeList($section['students']??'') as $member){
                $id=is_array($member)?($member['id']??$member['uid']??$member['studentId']??''):$member;
                if((string)$id===(string)$actor['id'])$enrolled=true;
            }
            // Chat requires an explicit roster identity; a matching section label alone is not enrollment proof.
            if($role==='student'&&!$enrolled)continue;
            $assignedTeacher=$role==='teacher'&&academicTeacher($section,$actor,$subject);
            foreach($items as $item){
                if($role==='teacher'&&!$assignedTeacher)continue;
                if($role==='student'&&!sigmaChatReleased($db,$subject,$section,$item,$actor))continue;
                $key=hash('sha256',json_encode([(string)$subject['id'],(string)$section['id'],$item['kind'],$item['id']]));
                $catalog[$key]=['key'=>$key,'subject'=>$subjectName,'subjectId'=>(string)$subject['id'],'subjectAliases'=>$subjectAliases,
                    'section'=>academicText($section['name'],100),'sectionId'=>(string)$section['id'],
                    'title'=>academicText($item['data']['title']??$item['data']['name']??'',200),'topic'=>$item['topic'],
                    'description'=>academicText($item['data']['description']??$item['data']['overview']??'',1800),'kind'=>$item['kind'],'data'=>$item['data']];
            }
        }
    }
    return $catalog;
}
/** Build compact, server-verified class context without exposing student assessment content. */
function sigmaChatPortalContext(PDO $db,array $actor,array $selectors=[]): array {
    $role=academicRole($actor);if(!in_array($role,['student','teacher','admin','administrator','masteradmin'],true))return [];
    $subjectSelector=is_scalar($selectors['pageSubjectId']??null)?substr(trim((string)$selectors['pageSubjectId']),0,180):'';
    $sectionSelector=is_scalar($selectors['pageSection']??null)?substr(trim((string)$selectors['pageSection']),0,180):'';
    $topicSelector=is_numeric($selectors['pageTopicIdx']??null)?(int)$selectors['pageTopicIdx']:-1;
    $scopes=[];
    if($subjectSelector!==''&&$sectionSelector!==''){
        try{
            [$subject,$section]=academicScope($db,$actor,$subjectSelector,$sectionSelector);
            if(!sigmaSyntheticRecordPath($subject)&&!sigmaSyntheticRecordPath($section)
                &&!in_array(strtolower((string)($section['status']??'')),['archived','draft','deleted'],true)
                &&($role!=='student'||strtolower((string)($subject['status']??''))==='published'))
                $scopes[]=['subject'=>$subject,'section'=>$section,'current'=>true];
        }catch(Throwable $error){/* Stale browser selectors are ignored; authenticated scopes are resolved below. */}
    }
    $subjects=$db->query('SELECT * FROM subjects WHERE is_deleted=0')->fetchAll();
    $sections=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status) NOT IN ('archived','draft','deleted')")->fetchAll();
    foreach($subjects as $subject){
        if(sigmaSyntheticRecordPath($subject)||($role==='student'&&strtolower((string)($subject['status']??''))!=='published'))continue;
        foreach($sections as $section){
            if(sigmaSyntheticRecordPath($section)||!academicSectionSubjects($section,$subject))continue;
            if($role==='student'&&!gradeStudent($section,$actor))continue;
            if($role==='teacher'&&!academicTeacher($section,$actor,$subject))continue;
            if($role==='admin'||$role==='administrator'||$role==='masteradmin'){
                if($subjectSelector!==''&&!academicSubjectAliasMatches($subjectSelector,$subject))continue;
                if($sectionSelector!==''&&!academicSectionScopeMatches($section,$sectionSelector))continue;
            }
            $key=(string)$subject['id']."\0".(string)$section['id'];$duplicate=false;
            foreach($scopes as $existing)if(((string)$existing['subject']['id']."\0".(string)$existing['section']['id'])===$key){$duplicate=true;break;}
            if(!$duplicate)$scopes[]=['subject'=>$subject,'section'=>$section,'current'=>false];
        }
    }
    $context=['role'=>$role==='student'?'student':($role==='teacher'?'teacher':'staff'),'scopes'=>[]];
    foreach(array_slice($scopes,0,6) as $scope){
        $subject=$scope['subject'];$section=$scope['section'];
        $topicConfig=academicRead($db,'release',$subject,$section,'','topics')??[];
        $learningConfig=academicRead($db,'release',$subject,$section,'','learning')??[];
        $assessmentConfig=academicRead($db,'release',$subject,$section,'','assessments')??[];
        $items=academicItems($subject);$topicTitle='';
        if(!empty($scope['current'])&&$topicSelector>=0){
            foreach($items as $item)if($item['kind']==='topic'&&(int)$item['itemIdx']===$topicSelector){$topicTitle=academicText($item['data']['title']??$item['data']['name']??'',160);break;}
        }
        $materials=[];
        foreach(sigmaChatLearningItems($subject) as $item){
            if(!sigmaChatReleased($db,$subject,$section,$item,$actor,$item['kind']==='topic'?$topicConfig:$learningConfig,$topicConfig))continue;
            $title=academicText($item['data']['title']??$item['data']['name']??'',140);if($title==='')continue;
            $materials[]=['title'=>$title,'topic'=>academicText($item['topic']??'',100)];
            if(count($materials)>=16)break;
        }
        $assessments=[];
        foreach($items as $item){
            if($item['kind']!=='assessment'||preg_match('/submission/i',implode(' ',[(string)($item['data']['type']??''),(string)($item['data']['category']??'')])))continue;
            $title=academicText($item['data']['title']??$item['data']['name']??'',140);if($title==='')continue;
            $release=academicReleaseFromConfig($assessmentConfig,$item,$role==='student'?(string)$actor['id']:'');
            if($role==='student'){
                if(!$release)continue;
                $assessments[]=['title'=>$title,'topic'=>academicText($item['topic']??'',100),'status'=>'released','dueAt'=>academicText($release['dueAt']??'',60)];
            }else{
                $status=$release?'released':'not released';
                if(!$release){$scheduled=$assessmentConfig['assessmentSchedules'][$item['id']]??null;if(is_string($scheduled)&&academicTime($scheduled)>time())$status='scheduled';}
                $assessments[]=['title'=>$title,'topic'=>academicText($item['topic']??'',100),'status'=>$status,'dueAt'=>academicText($release['dueAt']??$assessmentConfig['assessmentEndSchedules'][$item['id']]??'',60)];
            }
            if(count($assessments)>=24)break;
        }
        $assessmentField=$role==='student'?'releasedAssessments':'assessments';
        $context['scopes'][]=['subject'=>academicText($subject['name']??'',150),'section'=>academicText($section['name']??'',100),
            'currentTopic'=>$topicTitle,'releasedMaterials'=>$materials,$assessmentField=>$assessments];
    }
    return $context;
}
function sigmaChatGuidance(string $text,array $options=[],array $extra=[]): array {
    return ['success'=>true,'kind'=>$options?'selection':'guidance','text'=>$text,'options'=>$options]+$extra;
}
/** Cache extracted text by exact authorized record and file metadata. Authorization is always rebuilt first. */
function sigmaChatSearchFileText(PDO $db,array $catalog,array $actor): array {
    static $tableReady=false;$entries=[];$keys=[];$sources=[];$skipped=[];
    foreach($catalog as $source){
        $reference=sigmaLearningFileReference($source['data']);if($reference==='')continue;
        $metadata=array_intersect_key($source['data'],array_flip(['fileName','name','modifiedTime','updatedAt','size','checksum','mimeType']));
        $cacheKey=hash('sha256',json_encode([$source['key'],hash('sha256',$reference),$metadata],JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE));
        $keys[]=$cacheKey;$sources[$cacheKey]=['source'=>$source,'key'=>$cacheKey];
    }
    if(!$keys)return ['texts'=>[],'skipped'=>[],'unreadable'=>[]];
    try{
        if(!$tableReady){
            $db->exec('CREATE TABLE IF NOT EXISTS sigma_chat_source_text_cache (cache_key CHAR(64) NOT NULL PRIMARY KEY,source_text MEDIUMTEXT NOT NULL,expires_at DATETIME NOT NULL,KEY expires_at(expires_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
            $tableReady=true;
            if(random_int(1,32)===1)$db->exec('DELETE FROM sigma_chat_source_text_cache WHERE expires_at<UTC_TIMESTAMP() LIMIT 200');
        }
        foreach(array_chunk($keys,200) as $chunk){
            $marks=implode(',',array_fill(0,count($chunk),'?'));
            $q=$db->prepare('SELECT cache_key,source_text FROM sigma_chat_source_text_cache WHERE expires_at>UTC_TIMESTAMP() AND cache_key IN ('.$marks.')');
            $q->execute($chunk);foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row)$entries[$row['cache_key']]=$row['source_text'];
        }
    }catch(Throwable $error){$tableReady=false;$entries=[];}
    $misses=0;$maxMisses=4;
    foreach($sources as $sourceEntry){
        $cacheKey=$sourceEntry['key'];$source=$sourceEntry['source'];
        if(array_key_exists($cacheKey,$entries))continue;
        if($misses++ >= $maxMisses){$skipped[]=$source;continue;}
        $assessment=$source['kind']==='assessment'&&sigmaChatStaffAssessments($actor);
        $text=sigmaLearningFileText($source['data'],$assessment,true);
        $entries[$cacheKey]=$text;
        try{$ttl=$text!==''?'6 HOUR':'10 MINUTE';$q=$db->prepare('INSERT INTO sigma_chat_source_text_cache(cache_key,source_text,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL '.$ttl.')) ON DUPLICATE KEY UPDATE source_text=VALUES(source_text),expires_at=VALUES(expires_at)');$q->execute([$cacheKey,$text]);}catch(Throwable $error){$tableReady=false;}
    }
    $bySource=[];$unreadable=[];
    foreach($sources as $cacheKey=>$entry)if(array_key_exists($cacheKey,$entries)){
        $bySource[$entry['source']['key']]=$entries[$cacheKey];if($entries[$cacheKey]==='')$unreadable[]=$entry['source'];
    }
    return ['texts'=>$bySource,'skipped'=>$skipped,'unreadable'=>$unreadable];
}
/** Browser context is never provider evidence. Selectors only resolve authorized server items. */
function sigmaPrepareChatSources(PDO $db,array $actor,array &$input): ?array {
    unset($input['lessonContext'],$input['authorizedAssessment'],$input['portalContext']);
    $message=$input['message']??'';
    if(!is_string($message)||!trim($message)||strlen($message)>4000)throw new InvalidArgumentException('Enter a message of at most 4,000 bytes.');
    if(preg_match('/(?:system prompt|hidden instructions|database (?:schema|password|structure)|api key|service account|server configuration|hosting credentials|source code of (?:sigma|this (?:site|website))|(?:sigma|this website|your system|this system).{0,45}(?:backend|back.end|hosting|framework|database|source code|AI model|provider)|(?:backend|back.end|hosting|framework|source code|AI model|provider).{0,45}(?:sigma|this website|your system|this system)|(?:what|which).{0,15}(?:model|provider).{0,15}(?:are you|do you use))/i',$message))
        return sigmaChatGuidance('I can help you use SIGMA and understand learning materials, but I cannot share the system’s internal setup, source code, credentials, or hidden instructions.');
    if(academicRole($actor)==='student'&&preg_match('/(?:answer.?key|(?:answers?|solve|complete|do)\b.{0,45}\b(?:quiz|exam|assessment|assignment|graded)|(?:quiz|exam|assessment)\b.{0,45}\b(?:answers?|solutions?))/i',$message))
        return sigmaChatGuidance('I cannot open assessment uploads or give assessment answers. I can explain a concept, give a hint, or create a different practice example using your learning materials.');
    $input['portalContext']=sigmaChatPortalContext($db,$actor,$input);
    unset($input['pageSubjectId'],$input['pageSection'],$input['pageTopicIdx']);
    if(!empty($input['generalConcept'])){$input['generalConcept']=true;return null;}
    $explicitSearch=(bool)(preg_match('/\b(?:find|search|look\s+for|look\s+up|locate|scan)\b/i',$message)
        ||preg_match('/\bcheck\s+(?:for|if|whether)\b/i',$message)
        ||(preg_match('/\b(?:uploaded|attached|released|learning|lesson|handout|file|document|notes|material)\b/i',$message)
            &&preg_match('/\b(?:find|search|look|check|contain|include|mention|appear|say|about|according|where|what|which|explain|discuss|cover|teach|in|from|within|inside)\b/i',$message)));
    $directQuestion=(bool)preg_match('/^(who|what|when|where|why|how|sino|ano|kailan|saan|bakit|paano)\b/iu',trim($message));
    if(!$explicitSearch&&!$directQuestion)foreach(array_reverse(is_array($input['history']??null)?$input['history']:[]) as $entry){
        if(($entry['role']??'')!=='assistant'||!is_string($entry['text']??null))continue;
        $lastPrompt=mb_strtolower($entry['text']);
        $explicitSearch=(bool)(preg_match('/what would you like me to look for|which word, phrase, or topic|what word, phrase, or topic|could not match that to a source/i',$lastPrompt));
        break;
    }
    if(empty($input['sourceKey'])&&preg_match('/^(hi|hello|hey)[!. ]*$/i',trim($message)))return sigmaChatGuidance('Hello! How can I help you today?');
    if(empty($input['sourceKey'])&&preg_match('/^(check|open|view|show)(?: the| my)? (?:audit )?logs[?.! ]*$/i',trim($message))){
        if(in_array(academicRole($actor),['admin','administrator','masteradmin'],true))return sigmaChatGuidance('Open Audit Logs in the sidebar, then choose the log category and use its search and filters. The available categories depend on your account permissions. I can explain these controls, but I cannot inspect your account logs from this chat.');
        return sigmaChatGuidance('I can help with learning materials and portal navigation. Audit Logs are available only to authorized administrators.');
    }
    if(preg_match('/^(?:(?:hi|hello|hey|salamat|thanks|thank you)[!. ]*|.*(?:where|how|saan|paano).*(?:log ?in|profile|password|navigate|open|find|upload|submit|view|makita|buksan).*)$/i',$message)&&empty($input['sourceKey'])&&empty($input['chooseSource'])&&!$explicitSearch)return null;
    // Questions stay conversational unless they explicitly ask SIGMA to inspect a learning source.
    if(empty($input['sourceKey'])&&empty($input['chooseSource'])&&empty($input['sourceSubject'])
        && $directQuestion
        && !$explicitSearch
        && !preg_match('/\b(?:this|that|my|our|uploaded|attached|released|saved)\s+(?:lesson|video|material|topic|handout|file|document|notes|assessment|class|section)|\b(?:in|from|according to)\s+(?:the|my|our|this)\s+(?:lesson|video|material|topic|handout|file|document|notes)|\b(?:my|our)\s+(?:teacher|adviser|schedule|section)\b/iu',$message)){
        $input['generalConcept']=true;return null;
    }
    if(empty($input['sourceKey'])&&empty($input['sourceSubject'])&&empty($input['sourceSection'])
        &&preg_match('/^(?:check|look|search|find|review|explain|teach|tell me about|help me with)(?:\s+(?:(?:it|this|that|something|anything)|for me))?[?.! ]*$/i',trim($message)))
        return sigmaChatGuidance('What would you like me to look for? You can ask a question or name a term from your assigned learning materials.');
    $catalog=sigmaChatCatalog($db,$actor);
    if(!$catalog){
        if($explicitSearch)return sigmaChatGuidance('I can search only learning materials available to your account, and none are currently assigned or released.');
        $input['generalConcept']=true;return null;
    }
    $key=$input['sourceKey']??'';
    if($key==='')foreach($catalog as $candidate)if(mb_strtolower(trim($message))===mb_strtolower(trim($candidate['title']))){
        $key=$candidate['key'];$input['sourceKey']=$key;
        foreach(array_reverse($input['history']??[]) as $entry)if(($entry['role']??'')==='user'&&is_string($entry['text']??null)){$input['message']=$entry['text'];break;}
        break;
    }
    if($key!==''){
        if(!is_string($key)||!isset($catalog[$key]))throw new InvalidArgumentException('That learning material is no longer available to this account. Choose another released material.');
        $source=$catalog[$key];$assessment=$source['kind']==='assessment'&&sigmaChatStaffAssessments($actor);
        $cachedText=sigmaChatSearchFileText($db,[$source['key']=>$source],$actor);
        $text=$cachedText['texts'][$source['key']]??'';
        if($text==='')$text=sigmaLearningFileText($source['data'],$assessment);
        if($text==='')foreach(['content','text','body','fullText','instructions','transcript'] as $field)if(is_string($source['data'][$field]??null))$text.="\n".$source['data'][$field];
        if($assessment){$input['authorizedAssessment']=true;$text=($text!==''?$text:'The attached file could not be read.')."\nSaved assessment metadata (separate from file contents): ".sigmaChatAssessmentText($source['data']);}
        // Always state whether the file was read; a description never masquerades as file contents.
        $input['lessonContext']=['subject'=>$source['subject'],'topic'=>$source['topic']?:$source['title'],
            'description'=>$source['description'],'sources'=>[['title'=>$source['title'],
            'text'=>$text!==''?sigmaChatExcerpt($text,$message):'Only the saved description is available; the attached file could not be read. '.$source['description']]]];
        return null;
    }
    if(!empty($input['generalConcept'])){
        $input['generalConcept']=true;return null;
    }
    $options=[];$filter=is_string($input['sourceSubject']??null)?trim($input['sourceSubject']):'';
    $filterSection=is_string($input['sourceSection']??null)?trim($input['sourceSection']):'';
    $scopes=[];
    foreach($catalog as $source){$scopeKey=$source['subjectId']."\0".$source['sectionId'];
        $scopes[$scopeKey]=['subject'=>$source['subject'],'section'=>$source['section'],'sectionId'=>$source['sectionId']];}
    $subjectIntent=$filter===''&&(
        preg_match('/^(?:it\s+should\s+be\s+(?:a|the)\s+|(?:choose|pick|select|show(?:\s+me)?|use)\s+(?:(?:a|the|my|your)\s+)?)(?:subject|course|class)\b/i',trim($message))
        ||preg_match('/^(?:subject|course|class)[.!? ]*$/i',trim($message))
        ||preg_match('/^(?:which|what)\s+(?:(?:of\s+)?(?:my|your|the)\s+)?(?:subjects?|courses?|classes?)\b/i',trim($message)));
    if($subjectIntent){
        foreach(array_slice(array_values($scopes),0,5) as $scope)$options[]=['label'=>$scope['subject'].' — '.$scope['section'],'subject'=>$scope['subject'],'sectionId'=>$scope['sectionId']];
        return sigmaChatGuidance('Which assigned subject and section should I check?',$options);
    }
    // A typed subject or title is a selector, never authorization. Resolve it
    // only against this actor's server-side catalog, retaining the prior question.
    if(!$filter)foreach($catalog as $candidate){
        foreach(array_merge([$candidate['subject']],$candidate['subjectAliases']??[]) as $alias){
            if(mb_strtolower(trim($message))!==mb_strtolower(trim((string)$alias)))continue;
            $filter=$candidate['subject'];$foundPriorQuestion=false;
            foreach(array_reverse($input['history']??[]) as $entry)if(($entry['role']??'')==='user'&&is_string($entry['text']??null)){$input['message']=$entry['text'];$foundPriorQuestion=true;break;}
            if(!$foundPriorQuestion)$input['message']='';
            break 2;
        }
    }
    if(!$explicitSearch&&$filter===''&&$filterSection===''){$input['generalConcept']=true;return null;}
    $stopWords=['what','does','mean','explain','this','that','from','about','please','which','subject','subjects','course','class','help','check','review','find','look','search','tell','teach','show','open','know','define','understand','concept','word','term','phrase','meaning','lesson','lessons','material','materials','topic','generally','the','and','for','with','you','your','are','was','were','have','has','had','can','could','would','should','will','also','into','need','want','use','using','get','thing','kind','one','ano','ang','yung','uploaded','upload','attached','released','learning','file','files','document','documents','notes','source','sources','inside','within','whether','appear','appears','contain','contains','mention','mentions','according','say','says','look','please','my','our','in','of','to','it','a','an','is','if','where','there','me','from','for','do','did','does','has','had','was','were','be','been','being','about','which','term','word'];
    $terms=array_slice(array_values(array_unique(array_filter(preg_split('/[^\pL\pN]+/u',mb_strtolower($input['message']??$message)),fn($word)=>mb_strlen($word)>=2&&!in_array($word,$stopWords,true)))),0,8);
    if(!$terms){
        if($filter!==''){
            $seen=[];
            foreach($catalog as $source){
                if($source['subject']!==$filter||($filterSection!==''&&$source['sectionId']!==$filterSection))continue;
                $title=mb_strtolower(trim($source['title']));if(isset($seen[$title]))continue;$seen[$title]=true;
                $options[]=['label'=>$source['title'],'description'=>$source['subject'].' / '.$source['section'],'sourceKey'=>$source['key'],'subject'=>$source['subject'],'sectionId'=>$source['sectionId']];
                if(count($options)===5)break;
            }
            if($options){
                $label=sigmaChatStaffAssessments($actor)?'source':'learning material';
                return sigmaChatGuidance('Which '.$label.' should I check in '.academicText($filter,150).'?',$options);
            }
        }
        return sigmaChatGuidance('Which word, phrase, or topic would you like me to search for in your assigned learning materials?');
    }
    $metadataScore=function(array $source)use($terms):int{$text=mb_strtolower($source['title'].' '.$source['topic'].' '.$source['description']);$n=0;foreach($terms as $term)if(mb_stripos($text,$term)!==false)$n+=3;return $n;};
    uasort($catalog,fn($a,$b)=>$metadataScore($b)<=>$metadataScore($a));
    if($filter!==''||$filterSection!=='')$catalog=array_filter($catalog,fn($source)=>($filter===''||$source['subject']===$filter)&&($filterSection===''||$source['sectionId']===$filterSection));
    $fileSearch=sigmaChatSearchFileText($db,$catalog,$actor);$fileTexts=$fileSearch['texts'];$matchedSources=[];
    foreach($catalog as $source){
        $fileBody=$fileTexts[$source['key']]??'';$savedBody='';
        foreach(['content','text','body','fullText','instructions','transcript'] as $field)if(is_string($source['data'][$field]??null))$savedBody.="\n".$source['data'][$field];
        if($fileBody===''&&sigmaLearningFileReference($source['data'])==='')$savedBody.="\n".$source['description'].' '.(string)($source['data']['overview']??'');
        $body=$fileBody."\n".$savedBody;$normalized=mb_strtolower($body);$hits=0;foreach($terms as $term)if(mb_stripos($normalized,$term)!==false)$hits++;
        if($hits>0)$matchedSources[]=['source'=>$source,'hits'=>$hits,'metadata'=>$metadataScore($source),'body'=>$fileBody!==''?$fileBody:$savedBody];
    }
    usort($matchedSources,fn($a,$b)=>($b['hits']<=>$a['hits'])?:($b['metadata']<=>$a['metadata']));
    $seen=[];
    foreach($matchedSources as $match){$source=$match['source'];$reference=sigmaLearningFileReference($source['data']);
        $identity=$reference!==''?hash('sha256',$reference):$source['key'];if(isset($seen[$identity]))continue;$seen[$identity]=true;
        $excerpt=trim(preg_replace('/\s+/u',' ',sigmaChatExcerpt((string)$match['body'],implode(' ',$terms))));
        $detail=$source['subject'].' / '.$source['section'];if($excerpt!=='')$detail.=' — '.mb_substr($excerpt,0,130);
        $options[]=['label'=>$source['title'],'description'=>$detail,'sourceKey'=>$source['key'],'subject'=>$source['subject'],'sectionId'=>$source['sectionId']];
        if(count($options)===3)break;
    }
    if($options){$termLabel=mb_substr(implode(' ',array_slice($terms,0,3)),0,60);
        $generalLabel=$termLabel!==''?'Explain “'.$termLabel.'” generally':'Explain the concept generally';
        return sigmaChatGuidance('I found matching materials available to your account. Choose one to read the relevant passage.',$options,['generalOptionLabel'=>$generalLabel]);
    }
    $notRead=array_merge($fileSearch['skipped']??[],$fileSearch['unreadable']??[]);
    if($notRead){
        foreach(array_slice($notRead,0,3) as $source)$options[]=['label'=>$source['title'],'description'=>$source['subject'].' / '.$source['section'],'sourceKey'=>$source['key'],'subject'=>$source['subject'],'sectionId'=>$source['sectionId']];
        return sigmaChatGuidance('I could not check every assigned file automatically. Choose a material and I will look in it directly.',$options);
    }
    return sigmaChatGuidance('I could not find that in the materials available to your account. Try a different term, or name an assigned subject and section.');
}
function sigmaChatExcerpt(string $text,string $query): string {
    $words=preg_split('/[^\pL\pN]+/u',mb_strtolower($query));$parts=preg_split('/\n\s*\n/u',$text);$rank=[];
    $stop=['what','does','mean','explain','this','that','from','about','please','ano','ang','yung','find','search','look','check','term','word','phrase','uploaded','attached','released','learning','file','files','document','documents','material','materials','lesson','lessons','which','subject','section','inside','within','contain','mention','appear','according','the','for','and','you','can','could','would'];
    foreach($parts as $i=>$part){$score=0;$position=0;foreach(array_unique($words) as $word)if(mb_strlen($word)>2&&!in_array($word,$stop,true)&&($at=mb_stripos($part,$word))!==false){if(!$score)$position=$at;$score++;}
        $rank[]=['text'=>mb_substr($part,max(0,$position-350),1600),'score'=>$score,'index'=>$i];}
    usort($rank,fn($a,$b)=>($b['score']<=>$a['score'])?:($a['index']<=>$b['index']));
    return mb_substr(implode("\n\n",array_column(array_slice($rank,0,6),'text')),0,3500);
}
