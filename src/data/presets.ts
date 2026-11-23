import {
  MassarMetadata,
  ReportFontFamily,
  ReportTemplateSchema,
  ScoreBracket,
  StudentRecord,
} from '../types/report';

export interface ReportFontOption {
  id: ReportFontFamily;
  name: string;
  tag: string;
  description: string;
  cssClass: string;
  wordFontFamily: string;
}

export const REPORT_FONT_OPTIONS: ReportFontOption[] = [
  {
    id: 'cairo',
    name: 'خط القاهرة (Cairo)',
    tag: 'حديث ومتوازن',
    description: 'واضح العناوين والأرقام، مثالي لتقارير مذكرة التقويم الحديثة',
    cssClass: 'font-cairo',
    wordFontFamily: "'Cairo', 'Segoe UI', sans-serif",
  },
  {
    id: 'ibm-plex-sans-arabic',
    name: 'آي بي إم بلكس (IBM Plex)',
    tag: 'مؤسساتي تقني',
    description: 'دقة طباعية عالية في الجداول الإحصائية وقراءة الأرقام المتراصة',
    cssClass: 'font-plex-arabic',
    wordFontFamily: "'IBM Plex Sans Arabic', 'Cairo', 'Segoe UI', sans-serif",
  },
  {
    id: 'amiri',
    name: 'خط الأميري (Amiri)',
    tag: 'إداري كلاسيكي',
    description: 'نسخ تراثي رصين يلائم الوثائق الإدارية والتأشيرات الرسمية',
    cssClass: 'font-amiri',
    wordFontFamily: "'Amiri', 'Traditional Arabic', serif",
  },
  {
    id: 'noto-kufi-arabic',
    name: 'الكوفي الحديث (Noto Kufi)',
    tag: 'هندسي رسمي',
    description: 'بنية كوفية أنيقة تبرز الترويسات والأطر الرسمية بشكل متماسك',
    cssClass: 'font-kufi',
    wordFontFamily: "'Noto Kufi Arabic', 'Cairo', 'Segoe UI', sans-serif",
  },
  {
    id: 'tajawal',
    name: 'خط تجوال (Tajawal)',
    tag: 'انسيابي مريح',
    description: 'حروف ناعمة ومتباعدة بتوازن ممتاز مع الأقسام المكتظة',
    cssClass: 'font-tajawal',
    wordFontFamily: "'Tajawal', 'Cairo', 'Segoe UI', sans-serif",
  },
];

export function getReportFontClass(fontFamily?: ReportFontFamily | string): string {
  const match = REPORT_FONT_OPTIONS.find((opt) => opt.id === fontFamily);
  return match?.cssClass || 'font-cairo';
}

export function getWordFontFamily(fontFamily?: ReportFontFamily | string): string {
  const match = REPORT_FONT_OPTIONS.find((opt) => opt.id === fontFamily);
  return match?.wordFontFamily || "'Cairo', 'Segoe UI', sans-serif";
}

export interface ReportColorTheme {
  id: string;
  name: string;
  subtitle: string;
  accentColor: string;
  secondaryAccent: string;
  swatchBg: string;
}

export const REPORT_COLOR_THEMES: ReportColorTheme[] = [
  {
    id: 'royal-academic',
    name: 'أزرق أكاديمي رسمي',
    subtitle: 'المعيار الرسمي لمذكرة التقويم',
    accentColor: '#1e3a8a',
    secondaryAccent: '#0f766e',
    swatchBg: '#eff6ff',
  },
  {
    id: 'ministry-emerald',
    name: 'أخضر زمردي وزاري',
    subtitle: 'الهوية التربوية الوطنية المتوازنة',
    accentColor: '#0f766e',
    secondaryAccent: '#1e3a8a',
    swatchBg: '#f0fdfa',
  },
  {
    id: 'charcoal-slate',
    name: 'أردوازي إداري رصين',
    subtitle: 'وقور وعالي التباين للطباعة',
    accentColor: '#1e293b',
    secondaryAccent: '#0284c7',
    swatchBg: '#f8fafc',
  },
  {
    id: 'moroccan-burgundy',
    name: 'عنابي تراثي مغربي',
    subtitle: 'دفء إداري مستوحى من التراث الرسمي',
    accentColor: '#7c2d12',
    secondaryAccent: '#b45309',
    swatchBg: '#fff7ed',
  },
  {
    id: 'deep-indigo',
    name: 'نيلي معرفي عميق',
    subtitle: 'تباين حاد للرسوم البيانية والمؤشرات',
    accentColor: '#312e81',
    secondaryAccent: '#0d9488',
    swatchBg: '#eef2ff',
  },
  {
    id: 'olive-heritage',
    name: 'زيتوني تربوي هادئ',
    subtitle: 'مريح للعين ومناسب للتقارير المطولة',
    accentColor: '#365314',
    secondaryAccent: '#0f766e',
    swatchBg: '#f7fee7',
  },
];

export const EXAM_NUMBER_OPTIONS: {
  id: string;
  value: string;
  shortLabel: string;
  ordinalLabel: string;
}[] = [
  {
    id: 'exam-1',
    value: 'الفرض المحروس رقم 1',
    shortLabel: 'فرض 1',
    ordinalLabel: 'الفرض الأول',
  },
  {
    id: 'exam-2',
    value: 'الفرض المحروس رقم 2',
    shortLabel: 'فرض 2',
    ordinalLabel: 'الفرض الثاني',
  },
  {
    id: 'exam-3',
    value: 'الفرض المحروس رقم 3',
    shortLabel: 'فرض 3',
    ordinalLabel: 'الفرض الثالث',
  },
  {
    id: 'exam-4',
    value: 'الفرض المحروس رقم 4',
    shortLabel: 'فرض 4',
    ordinalLabel: 'الفرض الرابع',
  },
];

export const DEFAULT_METADATA: MassarMetadata = {
  academy: '',
  directorate: '',
  school: '',
  schoolYear: '',
  cycle: 'السلك الثانوي التأهيلي',
  level: '',
  className: '',
  subject: 'الرياضيات',
  teacherName: '',
  examNumber: 'الفرض المحروس رقم 1',
  semester: 'الدورة الأولى',
  examDate: '',
  correctionDate: '',
  duration: '2h',
  coefficient: '33.33%',
  examContent: '',
  examCriteria:
    '30% استرداد وتطبيق مباشر للمعارف · 50% توظيف المفاهيم وحل وضعيات مألوفة · 20% وضعيات مركبة وحل المشكلات.',
  gradingScaleNote: '',
  remediationFormat: 'حصص الدعم والتقوية والأنشطة العلاجية الممركزة',
};

export const SAMPLE_CLASS_METADATA: Partial<MassarMetadata> = {
  academy: 'الأكاديمية الجهوية للتربية والتكوين لجهة الرباط سلا القنيطرة',
  directorate: 'المديرية الإقليمية القنيطرة',
  school: 'الثانوية التأهيلية ابن الهيثم',
  schoolYear: '2025/2026',
  cycle: 'السلك الثانوي التأهيلي',
  level: 'الجذع المشترك العلمي - خيار فرنسية',
  className: 'TCSF-2',
  subject: 'الرياضيات',
  teacherName: 'إبراهيم قزيبر',
  examNumber: 'الفرض المحروس رقم 1',
  semester: 'الدورة الأولى',
  examDate: '2025-11-04',
  correctionDate: '2025-11-10',
  duration: '2h',
  coefficient: '33.33%',
  examContent: 'الحسابيات في مجموعة الأعداد الصحيحة الطبيعية IN · الحساب المتجهي في المستوى · الإسقاط في المستوى',
  gradingScaleNote: 'التمرين الأول (6 ن) · التمرين الثاني (7 ن) · التمرين الثالث (7 ن)',
};

export const SAMPLE_CLASS_STUDENTS: StudentRecord[] = [
  { id: 'st-1', order: 1, code: 'G134501201', fullName: 'آية العمراني', score: 18.5, isAbsent: false },
  { id: 'st-2', order: 2, code: 'G134501202', fullName: 'إلياس بنجلون', score: 16.75, isAbsent: false },
  { id: 'st-3', order: 3, code: 'G134501203', fullName: 'أميمة الفاسي', score: 15.0, isAbsent: false },
  { id: 'st-4', order: 4, code: 'G134501204', fullName: 'أمين التازي', score: 12.5, isAbsent: false },
  { id: 'st-5', order: 5, code: 'G134501205', fullName: 'بدر الدين السليماني', score: 8.5, isAbsent: false },
  { id: 'st-6', order: 6, code: 'G134501206', fullName: 'حفصة المنصوري', score: 17.25, isAbsent: false },
  { id: 'st-7', order: 7, code: 'G134501207', fullName: 'حمزة العلمي', score: 11.0, isAbsent: false },
  { id: 'st-8', order: 8, code: 'G134501208', fullName: 'خديجة المرابط', score: 14.25, isAbsent: false },
  { id: 'st-9', order: 9, code: 'G134501209', fullName: 'ريان بوعزة', score: 6.75, isAbsent: false },
  { id: 'st-10', order: 10, code: 'G134501210', fullName: 'زكرياء الإدريسي', score: 13.5, isAbsent: false },
  { id: 'st-11', order: 11, code: 'G134501211', fullName: 'سارة الصنهاجي', score: 19.0, isAbsent: false },
  { id: 'st-12', order: 12, code: 'G134501212', fullName: 'سعد الكتاني', score: null, isAbsent: true, observation: 'غياب مبرر بشهادة طبية' },
  { id: 'st-13', order: 13, code: 'G134501213', fullName: 'سلمى الناصري', score: 10.5, isAbsent: false },
  { id: 'st-14', order: 14, code: 'G134501214', fullName: 'طارق بناني', score: 4.5, isAbsent: false },
  { id: 'st-15', order: 15, code: 'G134501215', fullName: 'عبد الصمد اليعقوبي', score: 13.0, isAbsent: false },
  { id: 'st-16', order: 16, code: 'G134501216', fullName: 'فاطمة الزهراء الحسني', score: 15.75, isAbsent: false },
  { id: 'st-17', order: 17, code: 'G134501217', fullName: 'مريم القادري', score: 9.25, isAbsent: false },
  { id: 'st-18', order: 18, code: 'G134501218', fullName: 'معاذ الشرقاوي', score: 11.75, isAbsent: false },
  { id: 'st-19', order: 19, code: 'G134501219', fullName: 'نهيلة البقالي', score: 14.5, isAbsent: false },
  { id: 'st-20', order: 20, code: 'G134501220', fullName: 'ياسين العلوي', score: 7.5, isAbsent: false },
];

export const MEMO_142_BRACKETS: ScoreBracket[] = [
  {
    id: 'm1',
    label: '[0 - 4.99]',
    min: 0,
    max: 5,
    inclusiveMax: false,
    appreciation: 'تعثر حاد',
    colorHex: '#dc2626',
  },
  {
    id: 'm2',
    label: '[5 - 9.99]',
    min: 5,
    max: 10,
    inclusiveMax: false,
    appreciation: 'دون المتوسط',
    colorHex: '#ea580c',
  },
  {
    id: 'm3',
    label: '[10 - 13.99]',
    min: 10,
    max: 14,
    inclusiveMax: false,
    appreciation: 'متوسط - حسن',
    colorHex: '#2563eb',
  },
  {
    id: 'm4',
    label: '[14 - 17.99]',
    min: 14,
    max: 18,
    inclusiveMax: false,
    appreciation: 'جيد',
    colorHex: '#0d9488',
  },
  {
    id: 'm5',
    label: '[18 - 20]',
    min: 18,
    max: 20,
    inclusiveMax: true,
    appreciation: 'ممتاز',
    colorHex: '#16a34a',
  },
];

export const DEFAULT_BRACKETS: ScoreBracket[] = [
  { id: 'b1', label: 'أقل من 05', min: 0, max: 5, inclusiveMax: false, appreciation: 'تعثر حاد (دعم مكثف)', colorHex: '#dc2626' },
  { id: 'b2', label: 'من 05 إلى أقل من 10', min: 5, max: 10, inclusiveMax: false, appreciation: 'دون المعدل (دعم وقائي)', colorHex: '#ea580c' },
  { id: 'b3', label: 'من 10 إلى أقل من 12', min: 10, max: 12, inclusiveMax: false, appreciation: 'مقبول', colorHex: '#0284c7' },
  { id: 'b4', label: 'من 12 إلى أقل من 14', min: 12, max: 14, inclusiveMax: false, appreciation: 'مستحسن', colorHex: '#2563eb' },
  { id: 'b5', label: 'من 14 إلى أقل من 16', min: 14, max: 16, inclusiveMax: false, appreciation: 'حسن', colorHex: '#0d9488' },
  { id: 'b6', label: 'من 16 إلى 20', min: 16, max: 20, inclusiveMax: true, appreciation: 'ممتاز / متفوق', colorHex: '#16a34a' },
];

export const TEMPLATE_PRESETS: ReportTemplateSchema[] = [
  {
    id: 'preset-memo-142-dual',
    name: 'نموذجك المرفوع: بطاقة تقرير وتتبع الفرض + كشف النقط (مذكرة التقويم)',
    sourceType: 'analyzed-pdf',
    sourceFileName: 'نموذج التقرير المرفوع (صفحتان)',
    hasTwoPages: true,
    analysisSummary:
      'تم استنساخ نموذجك المكون من صفحتين بدقة: الصفحة 1 تضم الترويسة المغربية الثلاثية، بطاقة بيانات الفرض (8 خانات)، محتوى الفرض ومعايير مذكرة التقويم، جدول الـ 10 مؤشرات إحصائية، بطاقات فئات التحكم الـ 5 والمبيان الدائري المتداخل، تشخيص التعثرات وخطة المعالجة، والتوقيعات الثلاثية. الصفحة 2 تضم كشف النقط التسلسلي والترتيب الاستحقاقي متجاورين، وضعية الغياب، وإطارات المصادقة الرسمية.',
    detectedNotes: [
      'أشرطة أقسام زرقاء داكنة (#1e3a8a) مع حدود دقيقة وتظليل متدرج لفئات التحكم الخمس.',
      'بطاقة معطيات من 8 خانات تشمل: القسم، الأستاذ، تاريخ التمرير، تاريخ التصحيح، مدة الإنجاز، معامل الفرض، عدد المسجلين، ونسبة الحاصلين على المعدل.',
      'مبيان دائري (Donut) يتوسطه معدل القسم ونسبة الحاصلين على المعدل مع مفتاح تفصيلي بالعدد والنسبة.',
      'ملحق الصفحة الثانية يجمع بين الترتيب التسلسلي (ر.ت) والترتيب الاستحقاقي مع التقدير المزدوج (عربي/فرنسي).',
    ],
    headerConfig: {
      layout: 'three-column-moroccan',
      countryLine: 'المملكة المغربية',
      ministryLine: 'وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل',
      includeFrenchHeader: false,
      reportTitle: 'بطاقة تقرير وتتبع الفرض المحروس',
      reportSubtitle:
        'وثيقة بيداغوجية رسمية - مطابقة لمقتضيات مذكرة التقويم والتوجيهات التربوية الرسمية',
      appendixTitle: 'كشف النقط الرسمي والترتيب الاستحقاقي وتفييء مجموعات الحاجة',
    },
    styleConfig: {
      accentColor: '#1e3a8a',
      secondaryAccent: '#0f766e',
      borderStyle: 'section-banners',
      fontFamily: 'cairo',
      showOuterFrame: false,
      tableHeaderBg: 'solid-accent',
      chartType: 'donut',
    },
    passThreshold: 10,
    excellenceThreshold: 16,
    brackets: MEMO_142_BRACKETS,
    sections: [
      { id: 'm-meta', type: 'metadata_grid', title: 'بطاقة بيانات الفرض', enabled: true, page: 1 },
      {
        id: 'm-content',
        type: 'exam_content_box',
        title: '1. محتوى الفرض والأهداف والكفايات المقومة (مذكرة التقويم)',
        enabled: true,
        page: 1,
      },
      {
        id: 'm-kpi',
        type: 'kpi_summary',
        title: '2. النتائج والمؤشرات الإحصائية العامة وتوزيع النقط (مذكرة التقويم)',
        enabled: true,
        page: 1,
      },
      {
        id: 'm-split',
        type: 'brackets_and_donut_split',
        title: 'التمثيل المبياني للنسب المئوية (مذكرة التقويم)',
        enabled: true,
        page: 1,
      },
      {
        id: 'm-diag',
        type: 'pedagogical_diagnosis',
        title: '3. تشخيص المكتسبات والتعثرات وخطة المعالجة والدعم البيداغوجي المبرمجة',
        enabled: true,
        page: 1,
      },
      { id: 'm-sign1', type: 'signatures', title: 'التوقيعات والتأشيرات', enabled: true, page: 1 },
      {
        id: 'm-roster',
        type: 'dual_roster_merit',
        title: 'كشف نقط القسم حسب الترتيب التسلسلي والترتيب الاستحقاقي',
        enabled: true,
        page: 2,
      },
    ],
    signatures: [
      {
        id: 'sig-1',
        label: 'توقيع أستاذ(ة) المادة:',
        sublabel: 'المنجز(ة) للتقويم وخطة المعالجة',
        page2Sublabel: 'يشهد بصحة النقط ومطابقتها لأوراق التحرير المسلمة',
      },
      {
        id: 'sig-2',
        label: 'تأشيرة وملاحظات المفتش(ة) التربوي(ة):',
        sublabel: 'التأطير والمراقبة التربوية',
        page2Sublabel: 'ملاحظات حول سلم التنقيط وتوزيع النقط وأثر الدعم',
        page2Footer: 'التأشيرة والخاتم: .......................',
      },
      {
        id: 'sig-3',
        label: 'تأشيرة السيد(ة) رئيس(ة) المؤسسة:',
        sublabel: 'الإدارة التربوية / الحراسة العامة',
        page2Sublabel: 'اطلع عليه وأدرج بسجل المراقبة المستمرة للمؤسسة',
      },
    ],
    pedagogicalContent: {
      generalObservation:
        'تظهر نتائج الفرض تباينا بين فئة متمكنة حققت نقطا متميزة وفئة تحتاج إلى دعم استدراكي لتجاوز التعثرات المرصودة وتثبيت التعلمات الأساس.',
      strengths: [
        'تمكن الفئة المتفوقة من توظيف المفاهيم والمهارات الأساسية في الوضعيات المركبة بدقة.',
        'التحكم الجيد في أسئلة الاسترداد والتطبيق المباشر للمعارف بنسبة استجابة مرتفعة.',
      ],
      weaknesses: [
        'صعوبة في توظيف المنهجية السليمة وتبرير مراحل الإجابة.',
        'تعثر في استثمار المعطيات ومعالجة الأسئلة التركيبية غير المألوفة.',
      ],
      programmedRemediationBullets: [
        'تخصيص حصة التصحيح والدعم وفق مذكرة التقويم لمعالجة التعثرات المرصودة.',
        'توزيع بطاقات تمارين علاجية متدرجة حسب المستويات المهارية للإطار المرجعي.',
        'برمجة أنشطة تذكيرية مركزة في بداية الحصص المقبلة.',
      ],
      remediationNotes:
        'يُوصى بتتبع إنجاز التمارين العلاجية الفردية للتلاميذ الحاصلين على أقل من المعدل، مع استثمار التعلم بالقرين داخل المجموعات الصغرى.',
      remediationActions: [
        {
          targetGroup: 'الفئة المتعثرة (< 10/20)',
          competencies: 'تثبيت التعلمات الأساس واستدراك الثغرات المنهجية',
          activity: 'حصص الدعم والتقوية مع بطاقات تمارين علاجية متدرجة',
          timeframe: 'حصة التصحيح والأسبوع الموالي',
        },
        {
          targetGroup: 'الفئة المتوسطة (10 إلى 14)',
          competencies: 'تجويد منهجية الاستدلال وتبرير مراحل الحل',
          activity: 'تمارين تطبيقية موجهة وتصحيح تشاركي على السبورة',
          timeframe: 'أثناء الحصص الاعتيادية',
        },
      ],
    },
  },
  {
    id: 'preset-official-classic',
    name: 'النموذج الإداري الكلاسيكي (صفحة واحدة شاملة)',
    sourceType: 'preset',
    analysisSummary:
      'تقرير تربوي إداري متكامل بالترويسة المغربية الرسمية الثلاثية، يتضمن بطاقة المعطيات، المؤشرات الإحصائية، توزيع النقط حسب ست فئات، مبيان أعمدة، تشخيص التعثرات، وخطة الدعم والمعالجة.',
    headerConfig: {
      layout: 'three-column-moroccan',
      countryLine: 'المملكة المغربية',
      ministryLine: 'وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل',
      includeFrenchHeader: true,
      reportTitle: 'تقرير حول نتائج الفرض المحروس',
      reportSubtitle: 'دراسة إحصائية وتشخيص تربوي لنتائج المتعلمين وخطة الدعم والمعالجة',
    },
    styleConfig: {
      accentColor: '#0f766e',
      borderStyle: 'official-double',
      fontFamily: 'amiri',
      showOuterFrame: true,
      tableHeaderBg: 'tinted',
      chartType: 'bar',
    },
    passThreshold: 10,
    excellenceThreshold: 16,
    brackets: DEFAULT_BRACKETS,
    sections: [
      { id: 'sec-meta', type: 'metadata_grid', title: 'أولا: المعطيات الإدارية والتربوية', enabled: true },
      { id: 'sec-kpi', type: 'kpi_summary', title: 'ثانيا: المؤشرات الإحصائية العامة للفرض', enabled: true },
      { id: 'sec-brackets', type: 'brackets_table', title: 'ثالثا: توزيع التلاميذ حسب فئات النقط', enabled: true },
      { id: 'sec-chart', type: 'chart_distribution', title: 'رابعا: التمثيل المبياني لتوزيع النتائج', enabled: true },
      { id: 'sec-top-low', type: 'top_and_struggling', title: 'خامسا: تفييء المتعلمين (المتفوقون والمحتاجون للدعم)', enabled: true },
      { id: 'sec-diag', type: 'pedagogical_diagnosis', title: 'سادسا: قراءة تربوية وتشخيص التعثرات المرصودة', enabled: true },
      { id: 'sec-remed', type: 'remediation_plan', title: 'سابعا: خطة الدعم والمعالجة المقترحة', enabled: true },
      { id: 'sec-list', type: 'full_students_table', title: 'ملحق: اللائحة الاسمية لنتائج التلاميذ', enabled: false },
      { id: 'sec-sign', type: 'signatures', title: 'التوقيعات والمصادقة', enabled: true },
    ],
    signatures: [
      { id: 'sig-1', label: 'توقيع الأستاذ(ة)', sublabel: 'المشرف على المادة' },
      { id: 'sig-2', label: 'ملاحظة وتأشيرة الإدارة', sublabel: 'السيد(ة) المدير(ة) / الحارس العام' },
      { id: 'sig-3', label: 'تأشيرة السيد(ة) المفتش(ة) التربوي(ة)', sublabel: 'للتنسيق والتتبع' },
    ],
    pedagogicalContent: {
      generalObservation:
        'سجلت نتائج هذا الفرض تباينا طبيعيا في مستوى تحكم المتعلمين في الكفايات المستهدفة، مع تمكن نسبة معتبرة من التلاميذ من بلوغ عتبة التحكم الأساسي.',
      strengths: [
        'التحكم الجيد في تطبيق القواعد والخاصيات الأساسية في التمارين التطبيقية المباشرة.',
        'انضباط واضح في منهجية تحرير الأجوبة وتنظيم ورقة التحرير لدى أغلبية المتعلمين.',
      ],
      weaknesses: [
        'صعوبة في ترجمة الوضعيات المركبة إلى خطوات حل منظمة.',
        'أخطاء حسابية ومنهجية في التحويلات والتعليل المنطقي لبعض الأسئلة التركيبية.',
      ],
      programmedRemediationBullets: [
        'تخصيص حصة تصحيح تفاعلية لمعالجة الأخطاء المشتركة.',
        'توزيع سلاسل تمارين دعم متدرجة موجهة للمتعثرين.',
      ],
      remediationActions: [
        {
          targetGroup: 'الفئة المتعثرة (< 10/20)',
          competencies: 'تثبيت التعلمات الأساس واستدراك الثغرات المنهجية الأولية',
          activity: 'حصص دعم مندمجة مع سلاسل تمارين متدرجة الصعوبة موجهة فرديا',
          timeframe: 'الأسبوعان المواليان للتصحيح',
        },
        {
          targetGroup: 'الفئة المتوسطة (10 إلى 14)',
          competencies: 'تجويد منهجية التحليل والتعليل الدقيق',
          activity: 'ورشات عمل في مجموعات صغرى لحل وضعيات مركبة',
          timeframe: 'أثناء حصص الأنشطة الصفية',
        },
        {
          targetGroup: 'الفئة المتفوقة (≥ 14/20)',
          competencies: 'تنمية مهارات التفكير النقدي وحل المسائل المفتوحة',
          activity: 'تكليف بتمارين إثرائية ومسائل أولمبية وتدعيم التعلم بالقرين',
          timeframe: 'طيلة الدورة',
        },
      ],
    },
  },
];

