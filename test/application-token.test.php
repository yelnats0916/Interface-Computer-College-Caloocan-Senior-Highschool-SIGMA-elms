<?php
require_once __DIR__ . '/../php/includes/application_auth.php';
function getallheaders(): array { return $GLOBALS['testHeaders'] ?? []; }
function checkToken(string $expected): void { if (sigmaApplicationToken() !== $expected) throw new RuntimeException('Token header check failed'); }
$token = str_repeat('a', 64);
$GLOBALS['testHeaders'] = ['Authorization' => 'Bearer ' . $token];
checkToken($token);
$GLOBALS['testHeaders'] = ['aUtHoRiZaTiOn' => 'Bearer ' . $token];
checkToken($token);
$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . str_repeat('b', 64);
checkToken(str_repeat('b', 64));
unset($_SERVER['HTTP_AUTHORIZATION']);
$GLOBALS['testHeaders'] = ['Authorization' => 'Bearer invalid'];
checkToken('');
$GLOBALS['testHeaders'] = [];
checkToken('');
echo "5 token-header checks passed. No database access.\n";
