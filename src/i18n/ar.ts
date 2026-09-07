export const t = {
  appName: 'مصاريفي',

  // Onboarding
  onboardingSalaryTitle: 'مرتبك كام في الشهر؟',
  onboardingSalarySub: 'الرقم ده بيتحسب على جهازك بس. تقدر تعدّله أو تسيبه فاضي وتكمّله بعدين.',
  onboardingDayTitle: 'المرتب بينزل يوم كام؟',
  onboardingDaySub: 'عشان نعرف نحسب باقي معاك كام لحد المرتب الجاي.',
  skip: 'تخطّي',
  next: 'التالي',
  start: 'يلا نبدأ',

  // Home
  availableToday: 'متاح ليك النهاردة',
  overspentToday: 'عدّيت حدّك النهاردة',
  spentToday: 'صرفت النهاردة',
  spentWeek: 'الأسبوع ده',
  spentMonth: 'الشهر ده',
  remainingUntilSalary: 'باقي لحد المرتب',
  daysLeft: (n: number) => (n === 1 ? 'باقي يوم' : n === 2 ? 'باقي يومين' : `باقي ${n} يوم`),
  latestTransactions: 'آخر العمليات',
  noTransactions: 'لسه مفيش عمليات. سجّل أول مصروف — بياخد 5 ثواني.',
  setSalaryPrompt: 'ضيف مرتبك عشان نحسبلك المتاح اليومي',

  // Add
  addExpense: 'مصروف',
  addIncome: 'دخل',
  category: 'التصنيف',
  note: 'ملاحظة (اختياري)',
  save: 'حفظ',
  amountRequired: 'اكتب المبلغ الأول',
  today: 'النهاردة',
  yesterday: 'امبارح',

  // Reports
  reports: 'التقارير',
  weekly: 'أسبوعي',
  monthly: 'شهري',
  byCategory: 'التوزيع على التصنيفات',
  vsPrevious: 'مقارنة بالفترة اللي فاتت',
  topExpenses: 'أكبر 3 مصاريف',
  higherBy: (p: string) => `أعلى ${p} من الفترة اللي فاتت`,
  lowerBy: (p: string) => `أقل ${p} من الفترة اللي فاتت`,
  sameAsBefore: 'نفس الفترة اللي فاتت تقريبًا',
  noData: 'مفيش بيانات في الفترة دي',

  // Budgets
  budgets: 'الميزانيات',
  budgetsSub: 'حدّد سقف شهري لكل تصنيف، وهنبّهك قبل ما تعدّيه.',
  noLimit: 'من غير حد',
  setLimit: 'حدّد سقف',
  exceeded: 'عدّيت الميزانية',
  nearLimit: 'قربت من الحد',

  // Settings
  settings: 'الإعدادات',
  salary: 'المرتب',
  salaryDay: 'يوم نزول المرتب',
  currency: 'العملة',
  notifications: 'الإشعارات',
  weeklyReport: 'التقرير الأسبوعي',
  lock: 'القفل بالبصمة',
  backup: 'النسخة الاحتياطية',
  syncNow: 'زامن دلوقتي',
  lastSync: 'آخر مزامنة',
  neverSynced: 'لسه متزامنتش',
  syncing: 'بيزامن...',
  offline: 'مفيش نت — الداتا محفوظة على الجهاز',
  exportData: 'تصدير البيانات',
  recurring: 'المصاريف المتكررة',
  privacyNote:
    'مفيش تسجيل دخول ومفيش إيميل. بياناتك متخزنة على جهازك، والنسخة الاحتياطية مربوطة بمعرّف مجهول للجهاز.',

  // Recurring
  recurringSub: 'الإيجار والاشتراكات بتتسجل لوحدها كل شهر.',
  addRecurring: 'ضيف مصروف متكرر',
  dayOfMonth: 'يوم كام في الشهر',
  title: 'الاسم',
  active: 'شغّال',

  // Misc
  cancel: 'إلغاء',
  delete: 'حذف',
  confirmDelete: 'تحذف العملية دي؟',
  amount: 'المبلغ',
  unlockPrompt: 'افتح مصاريفي',
} as const;
