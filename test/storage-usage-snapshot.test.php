<?php
require dirname(__DIR__).'/php/includes/storage_usage_snapshot.php';
function expect($condition,$label){if(!$condition)throw new RuntimeException($label);}
$path=sigmaStorageSnapshotPath();$config=['folder_id'=>'fixture'];
try {
    $usage=['success'=>true,'usage'=>['folder_id'=>'fixture','total_bytes'=>1234]];
    file_put_contents($path,json_encode(['scope'=>hash('sha256',json_encode($config)),'at'=>time(),'result'=>$usage]));
    expect(sigmaStorageSnapshot($config)===$usage,'Fresh server snapshot must be returned unchanged.');
    file_put_contents($path.'.pending','pending');
    $start=microtime(true);
    expect(!empty(sigmaStorageSnapshot(['folder_id'=>'other'])['pending']),'Changed Drive configuration must not expose the previous snapshot.');
    expect(microtime(true)-$start<0.2,'Pending storage scan must release the HTTP worker immediately.');
    echo "PASS unchanged totals, scoped snapshot invalidation, immediate pending response.\n";
}finally{foreach([$path,$path.'.pending',$path.'.launch'] as $p)if(is_file($p))unlink($p);}
