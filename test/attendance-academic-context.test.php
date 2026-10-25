<?php
require dirname(__DIR__).'/php/includes/attendance_records.php';
$year=['id'=>'year26','year_start'=>2026,'year_end'=>2027,'q1_start'=>'2026-06-16','q1_end'=>'2026-08-22','q2_start'=>'2026-08-26','q2_end'=>'2026-10-24','q3_start'=>'2026-11-03','q3_end'=>'2027-01-23','q4_start'=>'2027-01-26','q4_end'=>'2027-03-31'];
$old=array_merge($year,['id'=>'year25','year_start'=>2025,'year_end'=>2026,'q1_start'=>'2025-06-16','q2_start'=>'2025-08-26','q3_start'=>'2025-11-03','q4_start'=>'2026-01-26','q4_end'=>'2026-03-31']);
foreach(['2026-10-24'=>2,'2026-10-25'=>2,'2026-11-02'=>2,'2026-11-03'=>3,'2027-01-24'=>3,'2027-01-26'=>4] as $date=>$quarter){$context=attendanceAcademicContext([$year,$old],['school_year'=>'2026-2027'],$date);if(($context['quarter']??null)!==$quarter)throw new Exception($date);}
$context=attendanceAcademicContext([$year,$old],['school_year'=>'2025-2026'],'2025-10-25');if($context['schoolYear']!=='2025-2026'||$context['quarter']!==2)throw new Exception('Historical year changed');
$context=attendanceAcademicContext([$year],['school_year'=>'2026-2027'],'2026-11-03',['quarter'=>2]);if($context['quarter']!==2)throw new Exception('Saved quarter must be retained');
echo "PASS submitted dates retain quarter through breaks, respect new quarter boundaries, preserve historical school year and saved period\n";
