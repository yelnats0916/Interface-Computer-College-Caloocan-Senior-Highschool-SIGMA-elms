<?php
function sigmaDailyInsightsDay(?DateTimeImmutable $now=null): string {
    return ($now??new DateTimeImmutable('now'))->setTimezone(new DateTimeZone('Asia/Manila'))->format('Y-m-d');
}
function sigmaDailyInsightsDue(array $ledger,string $day,?int $now=null): bool {
    if(($ledger['completedDay']??'')!==$day)return true;
    // Recheck a completed low-volume account after its evidence was inspected.
    // Evidence can arrive later in the day, and new accounts have no ledger yet.
    if(($ledger['day']??'')===$day&&(int)($ledger['count']??0)>=4)return false;
    return (int)($ledger['nextEvidenceCheckAt']??0)<=($now??time());
}
