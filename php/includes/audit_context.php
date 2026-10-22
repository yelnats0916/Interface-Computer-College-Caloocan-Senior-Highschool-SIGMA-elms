<?php
/** Human-readable context derived only from the recorded action and explicit identifiers. */
function sigmaAuditText($value): string {
    $text=is_scalar($value)?trim((string)$value):'';
    return in_array(strtolower($text),['','-','--','—','null','undefined'],true)?'':$text;
}
function sigmaActivityContext(string $activity,string $details='',array $accounts=[]): array {
    $details=sigmaAuditText($details);
    $module='System';$derived='';
    if(preg_match('/^Administrator settings verification (succeeded|failed|canceled)$/i',$activity,$match)){
        $module='Security';
        $derived=['succeeded'=>'Administrator identity was verified for protected integration settings.','failed'=>'The verification attempt for protected integration settings failed.','canceled'=>'Verification for protected integration settings was canceled.'][strtolower($match[1])]??'';
    }elseif(preg_match('/^(Created|Saved|Updated|Deleted|Restored|Deactivated|Activated|Locked|Unlocked)\s+(?:(Master Admin|Admin|Teacher|Student)\s+)?account\s+([^\s()]+)/i',$activity,$match)){
        $module='Users';$id=$match[3];$derived='Account ID: '.$id;
        if(!empty($match[2]))$derived.=' · Role at event: '.$match[2];
        if(isset($accounts[$id]))$derived.=' · Current account name: '.$accounts[$id];
    }elseif(preg_match('/account|profile|password|permission/i',$activity))$module='Users';
    elseif(preg_match('/subject|curriculum|material|topic/i',$activity))$module='Curriculum';
    elseif(preg_match('/section|class/i',$activity))$module='Classes';
    elseif(preg_match('/attendance/i',$activity))$module='Attendance';
    elseif(preg_match('/grade|score/i',$activity))$module='Grades';
    return ['module'=>$module,'details'=>$details?:($derived?:'Additional context was not captured for this event.')];
}
function sigmaAuthenticationContext(string $event,string $details=''): string {
    if(sigmaAuditText($details)!=='')return trim($details);
    $known=[
        'Login successful'=>'The account completed sign-in successfully.',
        'Failed login attempt'=>'Sign-in was unsuccessful. Credentials are never included in the log.',
        'Google Authenticator 2FA verified'=>'The account passed the authenticator code check.',
        'Logout'=>'The account signed out.',
        'Logout successful'=>'The account signed out.'
    ];
    return $known[$event]??'The authentication event was recorded; additional context was not captured.';
}
