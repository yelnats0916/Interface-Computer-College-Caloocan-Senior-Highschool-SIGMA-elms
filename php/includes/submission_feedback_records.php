<?php
// Older generated feedback remains usable while all of its original evidence
// is current. It must not be relabelled as submission-only feedback.
function sigmaSubmissionFeedbackRecordIsCurrent(?array $record,?array $submission,?array $score,?array $rubric,array $item,?array $note): bool {
    if(!$record||!$submission||empty($submission['attemptIdentity'])||($record['attemptIdentity']??'')!==$submission['attemptIdentity'])return false;
    if(empty($record['result']['feedback'])||!is_array($record['result']['feedback']))return false;
    if(($record['feedbackPolicy']??'')==='submission-v1')return true;
    if(!empty($record['feedbackPolicy']))return false;
    if(!preg_match('/^FDBK-\d{4}-\d{4,}$/D',$record['result']['generationId']??''))return false;
    if(!is_numeric($score['score']??null))return false;
    foreach(['gradeFingerprint'=>$score,'rubricFingerprint'=>$rubric,'curriculumFingerprint'=>$item,'teacherNoteFingerprint'=>$note] as $field=>$evidence){
        if(($record[$field]??'')!==hash('sha256',json_encode($evidence)))return false;
    }
    return true;
}
