<?php
function sigmaNormalizeQuizIcon($value): string {
    $supported = ['fa-bolt-lightning','fa-pen-nib','fa-code','fa-laptop-code','fa-brain','fa-book-open','fa-graduation-cap','fa-flask','fa-calculator','fa-atom','fa-palette','fa-lightbulb','fa-bolt','fa-file-pen','fa-file-signature','fa-clipboard-question','fa-clipboard-list'];
    foreach (preg_split('/\s+/', trim(is_scalar($value) ? (string)$value : '')) as $icon) {
        if (in_array($icon, $supported, true)) return $icon;
    }
    return 'fa-bolt-lightning';
}
