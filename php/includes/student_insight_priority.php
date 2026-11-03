<?php
// Review priority is not a grading formula or a prediction of final failure.
const SIGMA_STUDENT_INSIGHT_POLICY = 5;
function sigmaStudentConcernValue(array $record): ?float {
    if(is_numeric($record['grade']??null))return (float)$record['grade']>=0&&(float)$record['grade']<75?(float)$record['grade']:null;
    $percent=$record['averagePercent']??null;
    if(!is_numeric($percent)&&is_numeric($record['score']??null)&&is_numeric($record['maximumScore']??null)&&$record['maximumScore']>0)$percent=100*$record['score']/$record['maximumScore'];
    // Below half the available points is a review signal, not a school passing mark.
    return is_numeric($percent)&&$percent>=0&&$percent<50?(float)$percent:null;
}
function sigmaStudentConcernGroups(array $records): array {
    $groups=[];
    foreach($records as $record){
        $key=json_encode(array_map(fn($field)=>$record[$field]??'', ['subjectId','sectionId','schoolYear','quarter']));
        $value=sigmaStudentConcernValue($record);
        if($value!==null){$groups[$key]['records'][]=$record;$groups[$key]['severity']=max($groups[$key]['severity']??0,isset($record['grade'])?3:1);}
        $low=array_filter($record['observations']??[],fn($point)=>sigmaStudentConcernValue($point)!==null);
        if(count($low)>=2){$groups[$key]['trends'][]=$record;$groups[$key]['severity']=max($groups[$key]['severity']??0,2);}
    }
    foreach($groups as &$group){
        $group['records']=$group['records']??[];
        if(count(array_filter($group['records'],fn($r)=>!isset($r['grade'])))>=2)$group['severity']=max($group['severity'],2);
        usort($group['records'],fn($a,$b)=>(isset($b['grade'])<=>isset($a['grade'])) ?: (sigmaStudentConcernValue($a)<=>sigmaStudentConcernValue($b)) ?: strcmp($a['id'],$b['id']));
    }unset($group);
    uasort($groups,fn($a,$b)=>($b['severity']<=>$a['severity']) ?: (count($b['records'])<=>count($a['records'])));
    return $groups;
}
function sigmaSelectStudentInsightRecords(array $records,int $limit): array {
    $selected=[];$put=function($r)use(&$selected){$selected[$r['id']]=$r;};
    $groups=sigmaStudentConcernGroups($records);
    // Reserve evidence for each concern scope before filling the remaining space.
    foreach($groups as $group){foreach(array_slice($group['records'],0,2) as $r)$put($r);foreach(array_slice($group['trends']??[],0,1) as $r)$put($r);}
    usort($records,fn($a,$b)=>(isset($b['observations'])<=>isset($a['observations'])) ?: strcmp($b['date']??'',$a['date']??'' ) ?: strcmp($a['id'],$b['id']));
    foreach($records as $r)$put($r);
    return array_slice(array_values($selected),0,$limit);
}
function sigmaStudentRequiredConcernIds(array $snapshot): array {
    $required=[];$overall=($snapshot['scope']??'')==='overall';
    foreach($snapshot['areas'] as $area){
        $groups=sigmaStudentConcernGroups($area['records']);
        foreach($groups as $group){
            // A trend may cite its own dated observations; otherwise cite the low results.
            $ids=$group['severity']<3&&!empty($group['trends'])?[['ids'=>[$group['trends'][0]['id']]]]:[];
            if($group['records'])$ids[]=['ids'=>array_column(array_slice($group['records'],0,$group['severity']===2?2:1),'id')];
            if($ids)$required[]=['area'=>$area['id'],'alternatives'=>array_column($ids,'ids')];
            if(!$overall)break;
        }
    }
    // Dashboard cards focus on the main measured learning concern ahead of workflow feedback.
    return $overall?$required:array_slice($required,0,1);
}
function sigmaValidateStudentInsightPriority(array $cards,array $snapshot): void {
    foreach(sigmaStudentRequiredConcernIds($snapshot) as $rule){
        $covered=false;
        foreach($cards as $card)if($card['area']===$rule['area'])foreach($rule['alternatives'] as $ids)if(!array_diff($ids,$card['evidenceIds']))$covered=true;
        if(!$covered)throw new RuntimeException('Insight must address the supplied priority learning concern.');
    }
    foreach($cards as $card){
        $cited=[];foreach($snapshot['areas'] as $area)if($area['id']===$card['area'])foreach($area['records'] as $r)if(in_array($r['id'],$card['evidenceIds'],true))$cited[]=$r;
        // Quarterly performance bands cannot classify raw activity percentages.
        if(!array_filter($cited,fn($r)=>isset($r['grade']))&&preg_match('/\b(?:outstanding|very good|below passing|passing (?:mark|grade|threshold|score|standard)|(?:performance|grade) band|bagsak|pasadong marka)\b/iu',json_encode($card,JSON_UNESCAPED_UNICODE)))throw new RuntimeException('Quarterly grade bands cannot describe raw assessment scores.');
    }
}
function sigmaStudentQuarterContext(array $cards,array $snapshot): array {
    $labels=[1=>'1st Quarter',2=>'2nd Quarter',3=>'3rd Quarter',4=>'4th Quarter'];
    $names=[1=>'first',2=>'second',3=>'third',4=>'fourth'];
    foreach($cards as &$card){
        $quarters=[];
        foreach($snapshot['areas'] as $area)if($area['id']===$card['area'])foreach($area['records'] as $r)if(in_array($r['id'],$card['evidenceIds'],true)&&isset($labels[(int)($r['quarter']??0)]))$quarters[(int)$r['quarter']]=true;
        ksort($quarters);
        $prose=implode(' ',array_map(fn($a)=>($a['context']??'').' '.$a['text'],$card['analyses']));
        $missing=[];
        foreach(array_keys($quarters) as $q)if(!preg_match('/\b(?:'.$names[$q].'[- ]quarter|'.$q.'(?:st|nd|rd|th)?\s+quarter|quarter\s*'.$q.'|q'.$q.')\b/iu',$prose))$missing[]=$labels[$q];
        if($missing)$card['analyses'][0]['context']=implode(' and ',$missing).': '.ltrim($card['analyses'][0]['context']??'');
    }unset($card);
    return $cards;
}
