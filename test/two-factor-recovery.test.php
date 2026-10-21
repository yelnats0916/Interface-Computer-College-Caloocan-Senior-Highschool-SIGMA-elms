<?php
require_once __DIR__ . '/../php/includes/application_auth.php';
$cases = [
    [['id'=>'one','role'=>'Teacher'],['id'=>'two','role'=>'Student'],false],
    [['id'=>'one','role'=>'Student'],['id'=>'two','role'=>'Teacher'],false],
    [['id'=>'one','role'=>'Admin'],['id'=>'two','role'=>'Teacher'],true],
    [['id'=>'one','role'=>'Admin'],['id'=>'two','role'=>'Master Admin'],false],
    [['id'=>'one','role'=>'Master Admin'],['id'=>'two','role'=>'Master Admin'],true],
    [['id'=>'one','role'=>'Teacher'],['id'=>'one','role'=>'Teacher'],true],
    [[],[],false],
];
foreach ($cases as [$actor,$target,$expected]) {
    if (sigmaCanResetAuthenticator($actor,$target) !== $expected) throw new RuntimeException('Reset permission check failed.');
}
echo "7 reset permission checks passed. No database access.\n";
