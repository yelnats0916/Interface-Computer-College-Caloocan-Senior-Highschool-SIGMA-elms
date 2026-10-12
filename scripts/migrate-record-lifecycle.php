<?php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require_once dirname(__DIR__) . '/php/includes/record_lifecycle.php';
$db = serviceSettingsPdo();
$db->exec(file_get_contents(dirname(__DIR__) . '/database/record_lifecycle.sql'));
foreach (lifecycleTables($db) as $table) {
    $fields = array_column($db->query("SHOW COLUMNS FROM `$table`")->fetchAll(), 'Field');
    foreach (['is_deleted' => 'TINYINT(1) NOT NULL DEFAULT 0', 'deleted_at' => 'DATETIME NULL', 'deleted_by' => 'VARCHAR(50) NULL'] as $field => $type) {
        if (!in_array($field, $fields, true)) $db->exec("ALTER TABLE `$table` ADD `$field` $type");
    }
    // Legacy delete endpoints also set timestamps; no existing content is deleted.
    $trigger = 'sigma_lifecycle_' . $table;
    if (!$db->query("SHOW TRIGGERS WHERE `Trigger`=" . $db->quote($trigger))->fetch()) {
        $db->exec("CREATE TRIGGER `$trigger` BEFORE UPDATE ON `$table` FOR EACH ROW BEGIN
            IF NEW.is_deleted=1 AND COALESCE(OLD.is_deleted,0)=0 THEN SET NEW.deleted_at=UTC_TIMESTAMP();
            ELSEIF NEW.is_deleted=0 THEN SET NEW.deleted_at=NULL; SET NEW.deleted_by=NULL; END IF;
        END");
    }
    $insertTrigger = 'sigma_purge_guard_' . $table;
    $db->exec("DROP TRIGGER IF EXISTS `$insertTrigger`");
        $db->exec("CREATE TRIGGER `$insertTrigger` BEFORE INSERT ON `$table` FOR EACH ROW BEGIN
            IF EXISTS(SELECT 1 FROM record_lifecycle_events WHERE table_name='$table' AND BINARY record_id=BINARY NEW.id AND action='purge') THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='This record ID was permanently deleted and cannot be reused';
            END IF;
        END");
}
echo "Record lifecycle schema migrated without deleting existing records.\n";
