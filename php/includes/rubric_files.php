<?php
// Validate the file behind every named rubric before acknowledging a release.
function sigmaValidateReleaseRubrics(array $config, string $root): void {
    foreach ($config['assessmentRubrics'] ?? [] as $id => $name) {
        if (!$name) continue;
        $url = $config['assessmentRubricUrls'][$id] ?? '';
        if (!is_string($url)) throw new InvalidArgumentException('Invalid rubric attachment.');
        if (preg_match('~^https://[^\s]+$~iD', $url) && filter_var($url, FILTER_VALIDATE_URL)) continue;
        if (preg_match('~^uploads/(documents|materials)/[A-Za-z0-9_.-]+$~D', $url)) {
            $base = realpath($root.'/uploads');
            $file = realpath($root.'/'.$url);
            if ($base && $file && str_starts_with($file, $base.DIRECTORY_SEPARATOR) && is_file($file) && filesize($file) > 0) continue;
        }
        throw new InvalidArgumentException('The rubric "'.basename((string)$name).'" has no saved file. Upload it again before saving.');
    }
}
