<?php
/** Store uploaded topic covers once, and persist their shared URL in the topic JSON. */
function sigmaPersistTopicCovers(array &$subject,string $root): void {
    foreach($subject['topics']??[] as $key=>$topic){
        if(!is_array($topic))continue;
        $image=(string)($topic['image']??'');
        if(str_starts_with($image,'blob:'))throw new InvalidArgumentException('Select the cover image again before saving this topic.');
        if(!str_starts_with($image,'data:')){
            if(isset($topic['imageStorage'])&&($topic['imageStorage']['url']??'')!==$image)unset($subject['topics'][$key]['imageStorage']);
            continue;
        }
        if(!preg_match('~^data:(image/(?:png|jpeg|gif|webp|svg\+xml));(base64),(.+)$~sD',$image,$m))throw new InvalidArgumentException('Choose a PNG, JPEG, GIF, WebP or SVG cover image.');
        $bytes=base64_decode($m[3],true);
        if($bytes===false||$bytes===''||strlen($bytes)>5*1024*1024)throw new InvalidArgumentException('Cover images must be valid and no larger than 5 MB.');
        $mime=$m[1];$ext=['image/png'=>'png','image/jpeg'=>'jpg','image/gif'=>'gif','image/webp'=>'webp','image/svg+xml'=>'svg'][$mime];
        if($ext==='svg'){
            if(preg_match('/<!DOCTYPE|<!ENTITY/i',$bytes))throw new InvalidArgumentException('Use an SVG cover without document entities.');
            $doc=new DOMDocument();$before=libxml_use_internal_errors(true);$valid=$doc->loadXML($bytes,LIBXML_NONET);libxml_clear_errors();libxml_use_internal_errors($before);
            if(!$valid||$doc->documentElement->localName!=='svg')throw new InvalidArgumentException('Invalid SVG cover image.');
            $allowed=['svg','g','defs','linearGradient','radialGradient','stop','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','title','desc','clipPath','mask','pattern','use'];
            foreach($doc->getElementsByTagName('*') as $node){
                if(!in_array($node->localName,$allowed,true))throw new InvalidArgumentException('Use an SVG cover containing only image shapes and text.');
                foreach($node->attributes as $attr){
                    $value=preg_replace('/url\(\s*#[a-zA-Z0-9_-]+\s*\)/i','',$attr->value);
                    if(str_starts_with(strtolower($attr->localName),'on')||preg_match('/javascript:|url\s*\(|@import/i',$value)||($attr->localName==='href'&&!str_starts_with($attr->value,'#')))throw new InvalidArgumentException('The SVG cover contains unsupported active content.');
                }
            }
        }else{
            $info=@getimagesizefromstring($bytes);
            if(!$info||($info['mime']??'')!==$mime)throw new InvalidArgumentException('The cover image contents do not match its image format.');
        }
        $hash=hash('sha256',$bytes);$url='uploads/images/topic-cover-'.$hash.'.'.$ext;$path=rtrim($root,'/\\').'/'.$url;
        if(!is_dir(dirname($path))&&!mkdir(dirname($path),0755,true)&&!is_dir(dirname($path)))throw new RuntimeException('Cover image storage is unavailable.');
        if(!is_file($path)){
            $tmp=tempnam(dirname($path),'cover-');
            if($tmp===false||file_put_contents($tmp,$bytes)!==strlen($bytes)||!rename($tmp,$path))throw new RuntimeException('The cover image could not be saved.');
            chmod($path,0644);
        }
        $subject['topics'][$key]['image']=$url;
        $subject['topics'][$key]['imageStorage']=['url'=>$url,'mimeType'=>$mime,'size'=>strlen($bytes),'sha256'=>$hash];
    }
}
