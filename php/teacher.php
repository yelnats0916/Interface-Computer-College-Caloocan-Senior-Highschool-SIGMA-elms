<?php
// Canonical portal markup lives in one HTML source to prevent UI/data-flow divergence.
header('Cache-Control: no-store');
header('Location: ../teacher.html', true, 302);
exit;
