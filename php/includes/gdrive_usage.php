<?php
/** Read-only recursive inventory. Shortcuts and trashed files are excluded. */
function collectElmsDriveUsage(string $folderId, callable $request): array {
    if (!preg_match('/^[A-Za-z0-9_-]+$/', $folderId)) throw new RuntimeException('Configure an ELMS storage folder first.');
    $root = $request('https://www.googleapis.com/drive/v3/files/' . rawurlencode($folderId) . '?fields=id,mimeType,trashed&supportsAllDrives=true');
    if (($root['mimeType'] ?? '') !== 'application/vnd.google-apps.folder' || !empty($root['trashed'])) throw new RuntimeException('The connected ELMS folder is unavailable.');
    $groups = [];
    foreach (['pdf', 'documents', 'presentations', 'images', 'videos', 'others'] as $type) $groups[$type] = ['bytes' => 0, 'files' => 0];
    $folders = [$folderId]; $visited = []; $files = []; $bytes = 0; $unknown = 0; $requests = 0;
    $deadline = microtime(true) + 45;
    while ($folders) {
        $folder = array_pop($folders);
        if (isset($visited[$folder])) continue;
        $visited[$folder] = true;
        $page = null;
        do {
            if (++$requests > 1000 || microtime(true) > $deadline) throw new RuntimeException('The folder is too large to scan in one request. Usage is unavailable; no partial total is shown.');
            $params = ['q' => "'" . $folder . "' in parents and trashed = false", 'fields' => 'nextPageToken,incompleteSearch,files(id,name,mimeType,size)', 'pageSize' => 1000, 'supportsAllDrives' => 'true', 'includeItemsFromAllDrives' => 'true'];
            if ($page) $params['pageToken'] = $page;
            $result = $request('https://www.googleapis.com/drive/v3/files?' . http_build_query($params));
            if (!empty($result['incompleteSearch']) || !isset($result['files']) || !is_array($result['files'])) throw new RuntimeException('Google Drive returned an incomplete inventory.');
            foreach ($result['files'] as $file) {
                $id = $file['id'] ?? ''; $mime = $file['mimeType'] ?? '';
                if (!$id) continue;
                if ($mime === 'application/vnd.google-apps.folder') { $folders[] = $id; continue; }
                if ($mime === 'application/vnd.google-apps.shortcut' || isset($files[$id])) continue;
                $files[$id] = true;
                $ext = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
                $type = $mime === 'application/pdf' || $ext === 'pdf' ? 'pdf'
                    : (strpos($mime, 'image/') === 0 ? 'images'
                    : (strpos($mime, 'video/') === 0 ? 'videos'
                    : (in_array($ext, ['ppt', 'pptx', 'odp']) || $mime === 'application/vnd.google-apps.presentation' ? 'presentations'
                    : (in_array($ext, ['doc', 'docx', 'txt', 'odt', 'xls', 'xlsx', 'csv', 'ods']) || in_array($mime, ['application/vnd.google-apps.document', 'application/vnd.google-apps.spreadsheet']) ? 'documents' : 'others'))));
                $size = isset($file['size']) && is_numeric($file['size']) ? max(0, (int)$file['size']) : null;
                if ($size === null) $unknown++;
                $groups[$type]['files']++; $groups[$type]['bytes'] += $size ?? 0; $bytes += $size ?? 0;
            }
            $page = $result['nextPageToken'] ?? null;
        } while ($page);
    }
    return ['folder_id' => $folderId, 'total_bytes' => $bytes, 'total_files' => count($files), 'total_folders' => max(0, count($visited) - 1), 'unknown_size_files' => $unknown, 'types' => $groups, 'checked_at' => gmdate('c')];
}
