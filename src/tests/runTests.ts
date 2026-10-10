import { runAllTests } from './unitTests';

async function main() {
  console.log('تشغيل اختبارات الأمان لنظام FarmPro...\n');
  const res = await runAllTests();
  res.results.forEach(line => console.log(line));
  if (res.failed > 0) {
    console.error(`\nفشل ${res.failed} اختبار!`);
    process.exit(1);
  } else {
    console.log('\nجميع اختبارات الوحدة الأمنية اجتازت بنجاح 100%! 🎉');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('حدث خطأ أثناء تشغيل الاختبارات:', err);
  process.exit(1);
});
