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
function sigmaChatOwnAssessment(array $item,array $actor): bool {
    if($item['kind']!=='assessment')return false;
    foreach(['authorId','author_id','teacherId','createdBy'] as $field)if(is_scalar($item['data'][$field]??null)&&(string)$item['data'][$field]===(string)$actor['id'])return true;
    return false;
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
function sigmaChatReleased(PDO $db,array $subject,array $section,array $item,array $actor): bool {
    $category=$item['kind']==='topic'?'topics':'learning';
    $config=academicRead($db,'release',$subject,$section,'',$category);if(!$config)return false;
    if(!empty($item['parent'])){
        $parent=academicRead($db,'release',$subject,$section,'','topics')??[];
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
                if($role==='teacher'&&!$assignedTeacher&&!sigmaChatOwnAssessment($item,$actor))continue;
                if($role==='student'&&!sigmaChatReleased($db,$subject,$section,$item,$actor))continue;
                $key=hash('sha256',json_encode([(string)$subject['id'],(string)$section['id'],$item['kind'],$item['id']]));
                $catalog[$key]=['key'=>$key,'subject'=>academicText($subject['name'],150),'section'=>academicText($section['name'],100),
                    'title'=>academicText($item['data']['title']??$item['data']['name']??'',200),'topic'=>$item['topic'],
                    'description'=>academicText($item['data']['description']??$item['data']['overview']??'',1800),'kind'=>$item['kind'],'data'=>$item['data']];
            }
        }
    }
    return $catalog;
}
function sigmaChatGuidance(string $text,array $options=[]): array {
    return ['success'=>true,'kind'=>$options?'selection':'guidance','text'=>$text,'options'=>$options];
}
/** Browser context is never provider evidence. Selectors only resolve authorized server items. */
function sigmaPrepareChatSources(PDO $db,array $actor,array &$input): ?array {
    unset($input['lessonContext'],$input['authorizedAssessment']);
    $message=$input['message']??'';
    if(!is_string($message)||!trim($message)||strlen($message)>4000)throw new InvalidArgumentException('Enter a message of at most 4,000 bytes.');
    if(preg_match('/(?:system prompt|hidden instructions|database (?:schema|password|structure)|api key|service account|server configuration|hosting credentials|source code of (?:sigma|this (?:site|website))|(?:sigma|this website|your system|this system).{0,45}(?:backend|back.end|hosting|framework|database|source code|AI model|provider)|(?:backend|back.end|hosting|framework|source code|AI model|provider).{0,45}(?:sigma|this website|your system|this system)|(?:what|which).{0,15}(?:model|provider).{0,15}(?:are you|do you use))/i',$message))
        return sigmaChatGuidance('I can help you use SIGMA and understand learning materials, but I cannot share the system’s internal setup, source code, credentials, or hidden instructions.');
    if(academicRole($actor)==='student'&&preg_match('/(?:answer.?key|(?:answers?|solve|complete|do)\b.{0,45}\b(?:quiz|exam|assessment|assignment|graded)|(?:quiz|exam|assessment)\b.{0,45}\b(?:answers?|solutions?))/i',$message))
        return sigmaChatGuidance('I cannot open assessment uploads or give assessment answers. I can explain a concept, give a hint, or create a different practice example using your learning materials.');
    if(empty($input['sourceKey'])&&preg_match('/^(hi|hello|hey)[!. ]*$/i',trim($message)))return sigmaChatGuidance('Hello! How can I help you today?');
    if(empty($input['sourceKey'])&&preg_match('/^(check|open|view|show)(?: the| my)? (?:audit )?logs[?.! ]*$/i',trim($message))){
        if(in_array(academicRole($actor),['admin','administrator','masteradmin'],true))return sigmaChatGuidance('Open Audit Logs in the sidebar, then choose the log category and use its search and filters. The available categories depend on your account permissions. I can explain these controls, but I cannot inspect your account logs from this chat.');
        return sigmaChatGuidance('I can help with learning materials and portal navigation. Audit Logs are available only to authorized administrators.');
    }
    if(preg_match('/^(?:(?:hi|hello|hey|salamat|thanks|thank you)[!. ]*|.*(?:where|how|saan|paano).*(?:log ?in|profile|password|navigate|open|find|upload|submit|view|makita|buksan).*)$/i',$message)&&empty($input['sourceKey'])&&empty($input['chooseSource']))return null;
    $catalog=sigmaChatCatalog($db,$actor);
    $key=$input['sourceKey']??'';
    if($key==='')foreach($catalog as $candidate)if(mb_strtolower(trim($message))===mb_strtolower(trim($candidate['title']))){
        $key=$candidate['key'];$input['sourceKey']=$key;
        foreach(array_reverse($input['history']??[]) as $entry)if(($entry['role']??'')==='user'&&is_string($entry['text']??null)){$input['message']=$entry['text'];break;}
        break;
    }
    if($key!==''){
        if(!is_string($key)||!isset($catalog[$key]))throw new InvalidArgumentException('That learning material is no longer available to this account. Choose another released material.');
        $source=$catalog[$key];$assessment=$source['kind']==='assessment'&&sigmaChatStaffAssessments($actor);
        $text=sigmaLearningFileText($source['data'],$assessment);
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
    if(!$catalog){$input['generalConcept']=true;return null;}
    $options=[];$filter=is_string($input['sourceSubject']??null)?$input['sourceSubject']:'';
    $subjects=array_values(array_unique(array_column($catalog,'subject')));
    // A typed subject or title is a selector, never authorization. Resolve it
    // only against this actor's server-side catalog, retaining the prior question.
    if(!$filter)foreach($subjects as $subject)if(mb_strtolower(trim($message))===mb_strtolower($subject)){
        $filter=$subject;
        foreach(array_reverse($input['history']??[]) as $entry)if(($entry['role']??'')==='user'&&is_string($entry['text']??null)){$input['message']=$entry['text'];break;}
        break;
    }
    $terms=array_values(array_filter(preg_split('/[^\pL\pN]+/u',mb_strtolower($input['message']??$message)),fn($word)=>mb_strlen($word)>2&&!in_array($word,['what','does','mean','explain','this','that','from','about','please','which','subject','help','ano','ang','yung'],true)));
    $score=function(array $source)use($terms):int{
        $title=mb_strtolower($source['title'].' '.$source['topic']);$subject=mb_strtolower($source['subject']);$n=0;
        foreach(array_unique($terms) as $term){if(mb_strpos($title,$term)!==false)$n+=3;if(mb_strpos($subject,$term)!==false)$n+=2;}
        return $n;
    };
    uasort($catalog,fn($a,$b)=>$score($b)<=>$score($a));
    if(!$filter&&$terms){
        $matched=array_values(array_unique(array_column(array_filter($catalog,fn($source)=>$score($source)>0),'subject')));
        if(count($matched)===1)$filter=$matched[0];
    }
    if(!$filter&&count($subjects)>1){
        $subjects=array_values(array_unique(array_column($catalog,'subject')));
        foreach(array_slice($subjects,0,3) as $subject)$options[]=['label'=>$subject,'subject'=>$subject];
        return sigmaChatGuidance('Which of your subjects should I check for that word or concept?',$options);
    }
    $seen=[];
    foreach($catalog as $source){
        if($filter&&$source['subject']!==$filter)continue;
        $title=mb_strtolower(trim($source['title']));if(isset($seen[$title]))continue;$seen[$title]=true;
        $options[]=['label'=>$source['title'],'description'=>$source['subject'].' / '.$source['section'],'sourceKey'=>$source['key']];
        if(count($options)===3)break;
    }
    if(!$options)throw new InvalidArgumentException('Choose one of your available subjects.');
    return sigmaChatGuidance(sigmaChatStaffAssessments($actor)?'Which source should I review? Choose a suggestion or type the title.':'Which learning material should I check? Choose a suggestion or type the title.',$options);
}
function sigmaChatExcerpt(string $text,string $query): string {
    $words=preg_split('/[^\pL\pN]+/u',mb_strtolower($query));$parts=preg_split('/\n\s*\n/u',$text);$rank=[];
    foreach($parts as $i=>$part){$score=0;$position=0;foreach(array_unique($words) as $word)if(mb_strlen($word)>2&&!in_array($word,['what','does','mean','explain','this','that','from','about','please','ano','ang','yung'],true)&&($at=mb_stripos($part,$word))!==false){if(!$score)$position=$at;$score++;}
        $rank[]=['text'=>mb_substr($part,max(0,$position-350),1600),'score'=>$score,'index'=>$i];}
    usort($rank,fn($a,$b)=>($b['score']<=>$a['score'])?:($a['index']<=>$b['index']));
    return mb_substr(implode("\n\n",array_column(array_slice($rank,0,6),'text')),0,3500);
}
