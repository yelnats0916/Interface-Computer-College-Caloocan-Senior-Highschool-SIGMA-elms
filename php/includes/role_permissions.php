<?php
/** Defaults contain only options wired to the existing permission editor. */
function sigmaRolePermissionDefaults(string $role): array {
    $policies = json_decode('{"Master Admin":{"masterAdmin":true,"manageAdmins":true,"manageTeachers":true,"manageStudents":true,"actionPassword":true,"actionLock":true,"actionDeactivate":true,"actionDelete":true,"actionDeleteComments":true,"metricsMain":true,"schoolMain":true,"schoolProfile":true,"syAuthority":true,"syManage":true,"syCreateEdit":true,"syDelete":true,"schoolSections":true,"schoolSectionsDelete":true,"subjectAuthority":true,"subjectCreateEdit":true,"subjectDelete":true,"subjectPublish":true,"subjectUnpublish":true,"resourcesMain":true,"securityMain":true,"securityLogs":true,"teacherGrades":true,"teacherAttendance":true,"teacherMaterials":true,"teacherDeleteComments":true,"studentGrades":true,"studentBio":true,"noticeMessage":true},"Admin":{"masterAdmin":false,"manageAdmins":false,"manageTeachers":true,"manageStudents":true,"actionPassword":true,"actionLock":true,"actionDeactivate":false,"actionDelete":false,"actionDeleteComments":true,"metricsMain":true,"schoolMain":true,"schoolProfile":false,"syAuthority":true,"syManage":true,"syCreateEdit":true,"syDelete":false,"schoolSections":true,"schoolSectionsDelete":false,"subjectAuthority":true,"subjectCreateEdit":true,"subjectDelete":false,"subjectPublish":true,"subjectUnpublish":true,"resourcesMain":true,"securityMain":true,"securityLogs":true,"teacherGrades":false,"teacherAttendance":false,"teacherMaterials":false,"teacherDeleteComments":false,"studentGrades":false,"studentBio":false,"noticeMessage":false},"Teacher":{"masterAdmin":false,"manageAdmins":false,"manageTeachers":false,"manageStudents":false,"actionPassword":false,"actionLock":false,"actionDeactivate":false,"actionDelete":false,"actionDeleteComments":false,"metricsMain":false,"schoolMain":false,"schoolProfile":false,"syAuthority":false,"syManage":false,"syCreateEdit":false,"syDelete":false,"schoolSections":false,"schoolSectionsDelete":false,"subjectAuthority":false,"subjectCreateEdit":false,"subjectDelete":false,"subjectPublish":false,"subjectUnpublish":false,"resourcesMain":false,"securityMain":false,"securityLogs":false,"teacherGrades":true,"teacherAttendance":true,"teacherMaterials":true,"teacherDeleteComments":true,"studentGrades":false,"studentBio":false,"noticeMessage":false},"Student":{"masterAdmin":false,"manageAdmins":false,"manageTeachers":false,"manageStudents":false,"actionPassword":false,"actionLock":false,"actionDeactivate":false,"actionDelete":false,"actionDeleteComments":false,"metricsMain":false,"schoolMain":false,"schoolProfile":false,"syAuthority":false,"syManage":false,"syCreateEdit":false,"syDelete":false,"schoolSections":false,"schoolSectionsDelete":false,"subjectAuthority":false,"subjectCreateEdit":false,"subjectDelete":false,"subjectPublish":false,"subjectUnpublish":false,"resourcesMain":false,"securityMain":false,"securityLogs":false,"teacherGrades":false,"teacherAttendance":false,"teacherMaterials":false,"teacherDeleteComments":false,"studentGrades":true,"studentBio":true,"noticeMessage":false}}', true);
    if (!isset($policies[$role])) throw new InvalidArgumentException("Choose a supported institutional role.");
    return $policies[$role];
}
function sigmaNormalizeRolePermissions(string $role, $incoming): array {
    $defaults = sigmaRolePermissionDefaults($role);
    if (!is_array($incoming)) return $defaults;
    foreach ($defaults as $key => $value) {
        if (array_key_exists($key, $incoming) && is_bool($incoming[$key])) $defaults[$key] = $incoming[$key];
    }
    if ($role !== "Master Admin") $defaults["masterAdmin"] = false;
    if (in_array($role, ['Teacher','Student'], true)) {
        $prefix = $role === 'Teacher' ? 'teacher' : 'student';
        foreach ($defaults as $key => $value) if (strpos($key, $prefix) !== 0) $defaults[$key] = false;
    }
    return $defaults;
}

function sigmaActorPermission(array $actor, string $key): bool {
    $role = preg_replace('/[\s_-]+/', '', strtolower($actor['role'] ?? ''));
    if ($role === 'masteradmin') return true;
    $perms = is_array($actor['permissions'] ?? null) ? $actor['permissions'] : (json_decode($actor['permissions'] ?? '{}', true) ?: []);
    $roleName = ['admin'=>'Admin','teacher'=>'Teacher','student'=>'Student'][$role] ?? null;
    $defaults = $roleName ? sigmaRolePermissionDefaults($roleName) : [];
    return ($perms[$key] ?? $defaults[$key] ?? false) === true;
}
