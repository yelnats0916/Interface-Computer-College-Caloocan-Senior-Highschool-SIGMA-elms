<?php
// Service credentials are encrypted in the database, never embedded in website files.
require_once __DIR__ . '/../php/includes/service_secrets.php';
return loadServiceSettings();
