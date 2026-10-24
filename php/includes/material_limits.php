<?php
function sigmaMaterialLimits(array $saved=[]): array {
    $int=static fn($v,$d,$min,$max)=>is_numeric($v)?max($min,min($max,(int)$v)):$d;
    $video=$int($saved['video']['mp4']??$saved['video']['std']??null,200,100,500);
    $ext=$int($saved['video']['ext']??null,25,10,100);
    $embed=$saved['video']['embed']??30;if($embed===1)$embed=60;if($embed===2)$embed=90;
    $result=['video'=>['embed'=>$int($embed,30,15,90),'mp4'=>$video,'std'=>$video,'ext'=>$ext,'max'=>$video+$ext]];
    foreach(['docx'=>20,'pdf'=>25,'pptx'=>50] as $type=>$default){
        $std=$int($saved[$type]['std']??$saved[$type]['reg']??null,$default,10,100);
        $extra=$int($saved[$type]['ext']??null,5,5,50);
        $result[$type]=['std'=>$std,'reg'=>$std,'ext'=>$extra,'max'=>$std+$extra];
    }
    $result['batchQuota']=$result['submissionBatchQuota']=$int($saved['batchQuota']??$saved['submissionBatchQuota']??null,150,50,500);
    return $result;
}
function sigmaUpdateMaterialLimits(array $current,array $input,string $scope): array {
    $value=sigmaMaterialLimits($current);
    $validate=static function($v,$min,$max){if(filter_var($v,FILTER_VALIDATE_INT)===false||$v<$min||$v>$max)throw new InvalidArgumentException('A file limit is outside its allowed range.');return (int)$v;};
    if(in_array($scope,['standard','all'],true)){
        $value['video']['embed']=$validate($input['video']['embed']??null,15,90);
        $value['video']['mp4']=$validate($input['video']['mp4']??null,100,500);
        foreach(['docx','pdf','pptx'] as $type)$value[$type]['std']=$validate($input[$type]['std']??null,10,100);
    }
    if(in_array($scope,['advanced','all'],true)){
        $value['video']['ext']=$validate($input['video']['ext']??null,10,100);
        $extra=$validate($input['docx']['ext']??null,5,50);
        foreach(['docx','pdf','pptx'] as $type)$value[$type]['ext']=$extra;
        $value['batchQuota']=$validate($input['batchQuota']??null,50,500);
    }
    if(!in_array($scope,['standard','advanced','all'],true))throw new InvalidArgumentException('Invalid file-limit settings group.');
    return sigmaMaterialLimits($value);
}
function sigmaFileLimitMb(array $limits,string $name): int {
    $ext=strtolower(pathinfo($name,PATHINFO_EXTENSION));
    $type=in_array($ext,['mp4','webm','mov','mkv','avi'],true)?'video':(in_array($ext,['ppt','pptx'],true)?'pptx':($ext==='pdf'?'pdf':'docx'));
    return (int)$limits[$type]['max'];
}
function sigmaValidateUploadSize(array $limits,string $name,int $bytes): void {
    $max=sigmaFileLimitMb($limits,$name);
    if($bytes<0||$bytes>$max*1048576)throw new InvalidArgumentException('File exceeds the saved '.$max.' MB limit for this file type.');
}
function sigmaValidateSubmissionSize(array $limits,array $files): void {
    $total=0;foreach($files as $file){$size=(int)($file['size']??-1);sigmaValidateUploadSize($limits,(string)($file['name']??$file['fileName']??''),$size);$total+=$size;}
    if($total>$limits['batchQuota']*1048576)throw new InvalidArgumentException('Combined files exceed the saved '.$limits['batchQuota'].' MB submission quota.');
}
function sigmaReserveSubmissionBytes(PDO $db,string $user,string $batch,int $bytes,array $limits): array {
    if(!preg_match('/^[A-Za-z0-9_-]{8,64}$/D',$batch))throw new InvalidArgumentException('A submission upload group is required.');
    $db->beginTransaction();
    try {
        $db->prepare('INSERT IGNORE INTO upload_submission_batches(user_id,batch_id,total_bytes) VALUES(?,?,0)')->execute([$user,$batch]);
        $q=$db->prepare('UPDATE upload_submission_batches SET total_bytes=total_bytes+? WHERE user_id=? AND batch_id=? AND total_bytes+?<=?');
        $q->execute([$bytes,$user,$batch,$bytes,$limits['batchQuota']*1048576]);
        if(!$q->rowCount())throw new InvalidArgumentException('Combined files exceed the saved '.$limits['batchQuota'].' MB submission quota.');
        $db->commit();return [$bytes,$user,$batch];
    }catch(Throwable $error){if($db->inTransaction())$db->rollBack();throw $error;}
}
