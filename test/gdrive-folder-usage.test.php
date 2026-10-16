<?php
require_once __DIR__ . '/../php/includes/gdrive_usage.php';
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$usage = collectElmsDriveUsage('root', function ($url) {
    if (strpos($url, '/files/root?') !== false) return ['mimeType' => 'application/vnd.google-apps.folder'];
    parse_str(parse_url($url, PHP_URL_QUERY), $params);
    if (strpos($params['q'], "'child'") !== false) return ['files' => [
        ['id' => 'pic', 'name' => 'pic.png', 'mimeType' => 'image/png', 'size' => '200'],
        ['id' => 'shortcut', 'mimeType' => 'application/vnd.google-apps.shortcut'],
        ['id' => 'folder-cycle', 'mimeType' => 'application/vnd.google-apps.folder'],
        ['id' => 'native', 'mimeType' => 'application/vnd.google-apps.document']]];
    if (strpos($params['q'], "'folder-cycle'") !== false) return ['files' => [['id' => 'child', 'mimeType' => 'application/vnd.google-apps.folder']]];
    if (isset($params['pageToken'])) return ['files' => [['id' => 'doc', 'name' => 'paper.docx', 'size' => '300']]];
    return ['nextPageToken' => 'next', 'files' => [['id' => 'child', 'mimeType' => 'application/vnd.google-apps.folder'], ['id' => 'pdf', 'name' => 'a.pdf', 'size' => '100']]];
});
check($usage['total_files'] === 4, 'Recursive file count, excluding shortcuts and folders');
check($usage['total_folders'] === 2, 'Unique subfolders counted, excluding root and cycles');
check($usage['total_bytes'] === 600, 'Paginated recursive byte total');
check($usage['unknown_size_files'] === 1, 'Unreported size tracked');
check($usage['types']['documents']['files'] === 2, 'Native and uploaded documents grouped');
$empty = collectElmsDriveUsage('root', fn($url) => strpos($url, '/files/root?') !== false ? ['mimeType' => 'application/vnd.google-apps.folder'] : ['files' => []]);
check($empty['total_files'] === 0 && $empty['total_bytes'] === 0, 'Empty folder');
check($empty['total_folders'] === 0, 'No subfolders in empty root');
try {
    collectElmsDriveUsage('root', fn($url) => strpos($url, '/files/root?') !== false ? ['mimeType' => 'application/vnd.google-apps.folder'] : ['files' => [], 'incompleteSearch' => true]);
    throw new LogicException('Incomplete results accepted');
} catch (RuntimeException $e) { check(strpos($e->getMessage(), 'incomplete') !== false, 'Incomplete scan fails'); }
echo "PASS recursive inventory, pagination, cycles, sizes, empty and incomplete scans\n";
