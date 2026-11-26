import {
  MassarMetadata,
  ReportFontFamily,
  ReportFrameStyle,
  ReportSectionType,
  ReportTemplateSchema,
  ScoreBracket,
  StudentRecord,
} from '../types/report';

export interface AddableReportSectionOption {
  type: ReportSectionType;
  label: string;
  defaultTitle: string;
  description: string;
  defaultPage: 1 | 2;
  allowMultiple?: boolean;
  defaultBodyText?: string;
  defaultColumns?: string[];
  defaultRows?: string[][];
}

export const AVAILABLE_REPORT_SECTION_CATALOG: AddableReportSectionOption[] = [
  {
    type: 'metadata_grid',
    label: 'بطاقة المعطيات الإدارية والتربوية',
    defaultTitle: 'بطاقة بيانات الفرض المحروس',
    description: 'جدول القسم، الأستاذ، تاريخ التمرير والتصحيح، المدة، المعامل، وعدد المسجلين',
    defaultPage: 1,
  },
  {
    type: 'exam_content_box',
    label: 'محتوى الفرض والكفايات ومعايير المذكرة 142-08',
    defaultTitle: '1. محتوى الفرض والأهداف والكفايات المقومة (مذكرة التقويم)',
    description: 'المضامين، التوزيع المهاري (30% / 50% / 20%)، سلم التنقيط، وصيغة الدعم',
    defaultPage: 1,
  },
  {
    type: 'kpi_summary',
    label: 'جدول المؤشرات الإحصائية العشرة',
    defaultTitle: '2. النتائج والمؤشرات الإحصائية العامة وتوزيع النقط',
    description: 'المسجلون، الحاضرون، الغائبون، الحاصلون على المعدل، المعدل، الوسيط، الانحراف، أعلى وأدنى نقطة',
    defaultPage: 1,
  },
  {
    type: 'brackets_and_donut_split',
    label: 'بطاقات فئات التحكم + المبيان المدمج (أو منحنى غوص)',
    defaultTitle: 'التمثيل المبياني للنسب المئوية وتوزيع فئات التحكم',
    description: 'عرض مزدوج يجمع بطاقات الفئات الخمس مع المبيان الدائري أو منحنى غوص أو الأعمدة ومفتاح النسب',
    defaultPage: 1,
  },
  {
    type: 'gauss_curve_chart',
    label: 'منحنى غوص للتوزيع الطبيعي لنقط القسم (المذكرة 142-08)',
    defaultTitle: 'التوزيع الطبيعي لنقط القسم — منحنى غوص (Courbe de Gauss) وفق المذكرة 142-08',
    description: 'مبيان التوزيع الطبيعي (Gauss) لنقط المتعلمين مع المدرج التكراري، المنحنى المرجعي (μ=12)، ونطاق التمركز [μ-σ, μ+σ]',
    defaultPage: 1,
  },
  {
    type: 'brackets_table',
    label: 'جدول فئات النقط المستقل',
    defaultTitle: 'توزيع التلاميذ حسب فئات النقط ومستويات التحكم',
    description: 'جدول كلاسيكي مفصل يعرض كل فئة مع عدد التلاميذ والنسبة المئوية والتقدير التربوي',
    defaultPage: 1,
  },
  {
    type: 'chart_distribution',
    label: 'مبيان التوزيع المستقل',
    defaultTitle: 'التمثيل المبياني لتوزيع نتائج المتعلمين',
    description: 'مبيان مستقل (منحنى غوص أو أعمدة عمودية أو أفقية أو دائري) لتوزيع التلاميذ حسب الفئات',
    defaultPage: 1,
  },
  {
    type: 'top_and_struggling',
    label: 'تفييء المتعلمين (المتفوقون والمحتاجون للدعم)',
    defaultTitle: 'تفييء المتعلمين: لائحة التميز ولائحة الدعم الاستدراكي الفردي',
    description: 'جدولان متجاوران بأسماء ونقط التلاميذ المتفوقين والتلاميذ المتعثرين المستهدفين بالدعم',
    defaultPage: 1,
  },
  {
    type: 'pedagogical_diagnosis',
    label: 'التشخيص التربوي والتوصيات البيداغوجية',
    defaultTitle: '3. تشخيص المكتسبات والتعثرات والتوصيات التربوية المبرمجة',
    description: 'قراءة تربوية، مواطن القوة، الصعوبات المرصودة، وتوصيات التدخل والدعم',
    defaultPage: 1,
  },
  {
    type: 'remediation_plan',
    label: 'جدول خطة الدعم والمعالجة حسب مجموعات الحاجة',
    defaultTitle: 'خطة الدعم والمعالجة التربوية المبرمجة حسب الفئات',
    description: 'جدول إجرائي يربط كل فئة مستهدفة بالكفايات المعنية، أنشطة المعالجة، والغلاف الزمني',
    defaultPage: 1,
  },
  {
    type: 'dual_roster_merit',
    label: 'كشف النقط المزدوج (التسلسلي + الاستحقاقي)',
    defaultTitle: 'كشف نقط القسم حسب الترتيب التسلسلي والترتيب الاستحقاقي',
    description: 'ملحق الصفحة الثانية الرسمي بلائحة القسم كاملة، الترتيب الاستحقاقي، وضعية الغياب، والمصادقة',
    defaultPage: 2,
  },
  {
    type: 'full_students_table',
    label: 'اللائحة الاسمية الكاملة للتلاميذ (جدول موحد)',
    defaultTitle: 'ملحق: اللائحة الاسمية الكاملة لنتائج المتعلمين والتقديرات',
    description: 'جدول موحد يعرض الرقم، رمز مسار، الاسم الكامل، النقطة، والتقدير التربوي',
    defaultPage: 2,
  },
  {
    type: 'custom_text',
    label: 'فقرة توصيات تربوية / ملاحظات خاصة (مخصصة)',
    defaultTitle: 'توصيات تربوية وملاحظات تكميلية حول تتبع المتعلمين',
    description: 'مربع نصي حر لإضافة توصيات خاصة بالمجلس التعليمي أو ملاحظات المفتش أو الأستاذ',
    defaultPage: 1,
    allowMultiple: true,
    defaultBodyText:
      '• تعزيز التتبع الفردي للمتعلمين الحاصلين على نقطة دون عتبة التحكم (10/20) عبر أنشطة استدراكية موجهة.\n• استثمار التعلم بالقرين وتكليف المتعلمين المتفوقين بمساندة زملائهم داخل مجموعات العمل الصغرى.',
  },
  {
    type: 'custom_table',
    label: 'جدول مخصص (تتبع / أنشطة / مؤشرات إضافية)',
    defaultTitle: 'جدول تتبع الأنشطة التربوية ومجموعات الدعم',
    description: 'جدول حر قابل لتعديل الأعمدة والصفوف لإضافة أي بيانات تربوية خاصة بالقسم',
    defaultPage: 1,
    allowMultiple: true,
    defaultColumns: ['المجموعة / المحور', 'الإجراء التربوي المبرمج', 'مؤشر التحقق والتتبع'],
    defaultRows: [
      ['مجموعة الدعم الأساس (< 08/20)', 'بطاقات تصحيح ذاتي + تمارين تطبيقية مباشرة', 'تحسن النقطة في روائز التتبع القصيرة'],
      ['مجموعة التثبيت (08 إلى 12)', 'تدريب على صياغة البرهان الرياضي والتعليل', 'جودة التحرير في دفتر البحث والواجبات'],
    ],
  },
  {
    type: 'signatures',
    label: 'إطارات التوقيعات والتأشيرات الرسمية',
    defaultTitle: 'التوقيعات والتأشيرات الرسمية',
    description: 'خانات توقيع أستاذ المادة، المفتش التربوي، ورئيس المؤسسة',
    defaultPage: 1,
  },
];

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
  {
    id: 'noto-naskh-arabic',
    name: 'النسخ الرسمي (Noto Naskh)',
    tag: 'معيار الوثائق الرسمية',
    description: 'وضوح نسخي أصيل يجمع بين الرصانة الإدارية وسهولة القراءة في الجداول',
    cssClass: 'font-naskh-arabic',
    wordFontFamily: "'Noto Naskh Arabic', 'Traditional Arabic', serif",
  },
  {
    id: 'almarai',
    name: 'خط المراعي (Almarai)',
    tag: 'عصري مشرق',
    description: 'خط هندسي متناسق بعناوين حادة ومقروئية عالية عند الطباعة على A4',
    cssClass: 'font-almarai',
    wordFontFamily: "'Almarai', 'Cairo', 'Segoe UI', sans-serif",
  },
  {
    id: 'readex-pro',
    name: 'ريدكس برو (Readex Pro)',
    tag: 'تحريري متقن',
    description: 'تصميم حديث مضبوط التباعد مثالي للتقارير التحليلية والأرقام الإحصائية',
    cssClass: 'font-readex',
    wordFontFamily: "'Readex Pro', 'IBM Plex Sans Arabic', sans-serif",
  },
];

export interface ReportFrameOption {
  id: ReportFrameStyle;
  name: string;
  description: string;
}

export const REPORT_FRAME_OPTIONS: ReportFrameOption[] = [
  {
    id: 'double-inset',
    name: 'إطار وزاري مزدوج',
    description: 'إطار داخلي مزدوج دقيق مع شريط لوني متدرج في الأعلى',
  },
  {
    id: 'royal-corners',
    name: 'إطار زوايا رسمي فاخر',
    description: 'زوايا هندسية بارزة مع خط داخلي متناسق بلمسة رسمية',
  },
  {
    id: 'classic-double',
    name: 'إطار كلاسيكي مزدوج',
    description: 'الإطار الإداري التقليدي بخط مزدوج متين داخل الهوامش',
  },
  {
    id: 'top-bottom-bands',
    name: 'شريط علوي وسفلي',
    description: 'تأطير عصري هادئ بشريطين متدرجين دون حدود جانبية',
  },
  {
    id: 'none',
    name: 'بدون إطار خارجي',
    description: 'صفحة مفتوحة بسيطة بدون إطار محيط بالورقة',
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
    id: 'royal-emerald-gold',
    name: 'زمردي وذهبي ملكي',
    subtitle: 'فخامة رسمية مستوحاة من الهوية المغربية',
    accentColor: '#065f46',
    secondaryAccent: '#b45309',
    swatchBg: '#ecfdf5',
  },
  {
    id: 'sapphire-gold',
    name: 'ياقوتي وأوكسيد ذهبي',
    subtitle: 'تباين تنفيذي رفيع للوثائق الرسمية',
    accentColor: '#172554',
    secondaryAccent: '#a16207',
    swatchBg: '#eff6ff',
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
    name: 'القالب الرسمي المزدوج: تقرير وتتبع الفرض + كشف النقط (مذكرة التقويم 142-08)',
    focusBadge: 'تركيز شامل: المذكرة 142-08 + كشف النقط المزدوج',
    useCaseTag: 'صفحتان A4 · الدفتر التربوي والمفتشية',
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
      frameStyle: 'double-inset',
      fontFamily: 'cairo',
      showOuterFrame: true,
      tableHeaderBg: 'solid-accent',
      chartType: 'gauss',
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
    id: 'preset-individual-focus',
    name: 'قالب التحليل الفردي وتفييء المتعلمين (تركيز على التتبع الفردي)',
    focusBadge: 'تركيز فردي: لوائح المتفوقين والمتعثرين والترتيب الاستحقاقي',
    useCaseTag: 'صفحتان A4 + بطاقات الدعم الفردية',
    sourceType: 'preset',
    hasTwoPages: true,
    analysisSummary:
      'قالب مصمم خصيصاً لتشخيص وضعية كل متعلم وتفييء القسم إلى مجموعات حاجة واضحة بالأسماء والنقط: يبرز في الصفحة الأولى جدول تفييء المتعلمين (لائحة التميز ولائحة الدعم الفردي العاجل)، المؤشرات الإحصائية، توزيع الفئات الخمس، وتشخيص الصعوبات الفردية، مع كشف النقط المزدوج في الصفحة الثانية وإرفاق بطاقات الدعم الفردية.',
    detectedNotes: [
      'يُبرز جدول تفييء المتعلمين بالأسماء والنقط في قلب الصفحة الأولى لتسهيل قراءة الحالات الفردية.',
      'يُفعّل تلقائياً إرفاق بطاقات الدعم الفردية للمتعثرين عند الطباعة الكاملة.',
      'يرفق كشف النقط التسلسلي والترتيب الاستحقاقي في الصفحة الثانية لتوثيق مرتبة كل تلميذ.',
    ],
    headerConfig: {
      layout: 'three-column-moroccan',
      countryLine: 'المملكة المغربية',
      ministryLine: 'وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل',
      includeFrenchHeader: false,
      reportTitle: 'تقرير التحليل الفردي وتفييء المتعلمين حسب نتائج الفرض',
      reportSubtitle: 'تشخيص فردي لمستويات التحكم وتصنيف مجموعات الدعم والتميز وفق مذكرة التقويم 142-08',
      appendixTitle: 'كشف النقط الفردي المزدوج (التسلسلي والاستحقاقي) ووضعية الغياب',
    },
    styleConfig: {
      accentColor: '#312e81',
      secondaryAccent: '#0d9488',
      borderStyle: 'section-banners',
      frameStyle: 'double-inset',
      fontFamily: 'ibm-plex-sans-arabic',
      showOuterFrame: true,
      tableHeaderBg: 'solid-accent',
      chartType: 'horizontal-bar',
    },
    passThreshold: 10,
    excellenceThreshold: 15,
    brackets: MEMO_142_BRACKETS,
    sections: [
      { id: 'ind-meta', type: 'metadata_grid', title: 'بطاقة بيانات الفرض والقسم', enabled: true, page: 1 },
      {
        id: 'ind-kpi',
        type: 'kpi_summary',
        title: '1. المؤشرات الإحصائية العامة ومستويات الأداء الفردي',
        enabled: true,
        page: 1,
      },
      {
        id: 'ind-top-low',
        type: 'top_and_struggling',
        title: '2. التفييء الاسمي للمتعلمين: مجموعة التميز ومجموعة الدعم الفردي الاستدراكي',
        enabled: true,
        page: 1,
      },
      {
        id: 'ind-split',
        type: 'brackets_and_donut_split',
        title: '3. توزيع المتعلمين حسب فئات التحكم الخمس (مذكرة التقويم 142-08)',
        enabled: true,
        page: 1,
      },
      {
        id: 'ind-diag',
        type: 'pedagogical_diagnosis',
        title: '4. تشخيص التعثرات الفردية وتوصيات التتبع والمواكبة بالقرين',
        enabled: true,
        page: 1,
      },
      { id: 'ind-sign', type: 'signatures', title: 'التوقيعات والتأشيرات الرسمية', enabled: true, page: 1 },
      {
        id: 'ind-roster',
        type: 'dual_roster_merit',
        title: 'كشف النقط الفردي المزدوج (التسلسلي والاستحقاقي) وتصنيف التقديرات',
        enabled: true,
        page: 2,
      },
    ],
    signatures: [
      {
        id: 'sig-1',
        label: 'توقيع أستاذ(ة) المادة:',
        sublabel: 'المشرف(ة) على التشخيص والتتبع الفردي',
        page2Sublabel: 'يشهد بصحة النقط الفردية ومطابقتها لأوراق التحرير',
      },
      {
        id: 'sig-2',
        label: 'تأشيرة وملاحظات المفتش(ة) التربوي(ة):',
        sublabel: 'التأطير التربوي وتتبع أثر الدعم الفردي',
        page2Sublabel: 'ملاحظات حول تفييء المتعلمين ونجاعة البطاقات العلاجية',
        page2Footer: 'التأشيرة والخاتم: .......................',
      },
      {
        id: 'sig-3',
        label: 'تأشيرة السيد(ة) رئيس(ة) المؤسسة:',
        sublabel: 'الإدارة التربوية / الحراسة العامة',
        page2Sublabel: 'اطلع عليه وأدرج بملف تتبع نتائج المتعلمين',
      },
    ],
    pedagogicalContent: {
      generalObservation:
        'يُبرز التحليل الفردي للنتائج تمايزاً واضحاً في وتيرة الاستيعاب بين المتعلمين؛ حيث أظهرت مجموعة التميز تحكماً منهجياً عالياً، في حين تحتاج الفئة المتعثرة (< 10/20) إلى مواكبة فردية مشخصة عبر بطاقات الدعم والتعلم بالقرين.',
      strengths: [
        'تحكم فردي متميز لدى الفئة المتفوقة في صياغة البراهين الرياضية واستثمار التعاريف بدقة.',
        'تفاعل إيجابي للفئة المتوسطة مع أسئلة التطبيق المباشر والحساب الجبري.',
      ],
      weaknesses: [
        'تفاوت فردي في القدرة على ترجمة المعطيات اللفظية والهندسية إلى علاقات رياضية.',
        'حاجة الفئة المتعثرة إلى تقوية المكتسبات القبلية الأساس وضبط القواعد الإشارية والحسابية.',
      ],
      programmedRemediationBullets: [
        'تسليم بطاقة دعم فردية مشخصة لكل تلميذ حاصل على أقل من 10/20 مرفقة بواجب استدراكي موجه.',
        'توزيع القسم خلال حصة الدعم إلى مجموعات حاجة صغرى بإشراف تلاميذ مجموعة التميز (التعلم بالقرين).',
        'إجراء رائز تتبع قصير (15 دقيقة) لقياس أثر الدعم الفردي وتحيين فئات التحكم.',
      ],
      remediationNotes:
        'يتم استثمار لائحة التفييء أعلاه في توجيه الأسئلة الصفية اليومية ومراقبة دفاتر التمارين الخاصة بالتلاميذ المدرجين في لائحة الدعم.',
      remediationActions: [
        {
          targetGroup: 'مجموعة الدعم المكثف (< 05/20)',
          competencies: 'استدراك المكتسبات القبلية الأساس والقواعد الحسابية الأولية',
          activity: 'بطاقات دعم فردية مبسطة + مواكبة مباشرة من الأستاذ أثناء حصة التصحيح',
          timeframe: 'حصة التصحيح + تتبع أسبوعي فردي',
        },
        {
          targetGroup: 'مجموعة الدعم الوقائي (05 إلى 9.99)',
          competencies: 'تثبيت منهجية تطبيق الخاصيات وتفادي الأخطاء الشائعة',
          activity: 'تمارين علاجية موجهة + إشراك في ثنائيات التعلم بالقرين مع المتفوقين',
          timeframe: 'الأسبوعان المواليان للتصحيح',
        },
        {
          targetGroup: 'مجموعة التميز والإثراء (≥ 15/20)',
          competencies: 'تعميق الاستدلال الرياضي وحل المسائل المركبة',
          activity: 'تمارين إثرائية وتنشيط ورشات مساندة الزملاء داخل القسم',
          timeframe: 'مستمر طيلة الدورة',
        },
      ],
    },
    remediationCardsConfig: {
      enabledInFullReport: true,
      targetFilter: 'struggling',
      includeAbsent: false,
      cardsPerSheet: 4,
      showParentSignature: true,
      showCutGuides: true,
      showPostSupportEval: true,
      defaultExerciseTask: '',
      sessionDate: '',
    },
  },
  {
    id: 'preset-pedagogical-recommendations',
    name: 'قالب التوصيات التربوية وخطة الدعم والمعالجة (تركيز بيداغوجي)',
    focusBadge: 'تركيز بيداغوجي: التشخيص والتوصيات وجدول خطة الدعم',
    useCaseTag: 'صفحة واحدة مركزة · التفتيش والمجالس التعليمية',
    sourceType: 'preset',
    hasTwoPages: false,
    analysisSummary:
      'قالب بيداغوجي يركز على الجوانب التربوية والديداكتيكية المطلوبة في زيارات التأطير والمجالس التعليمية: يبرز محتوى الفرض والكفايات المقومة وفق المذكرة 142-08، خلاصة المؤشرات، التشخيص التربوي المعمق (مواطن القوة، الصعوبات، التوصيات المبرمجة)، جدول خطة الدعم والمعالجة المفصل حسب مجموعات الحاجة والغلاف الزمني، وتفييء المتفوقين والمتعثرين في صفحة واحدة منسقة.',
    detectedNotes: [
      'يجمع بين مربع التشخيص التربوي والتوصيات المبرمجة وبين جدول خطة الدعم الإجرائية في نفس الصفحة.',
      'يبرز مدى مطابقة الفرض للتوزيع المهاري (30% استرداد · 50% تطبيق · 20% وضعيات مركبة).',
      'مثالي لتوثيق حصة التصحيح والدعم وتقديمه للسيد(ة) المفتش(ة) التربوي(ة).',
    ],
    headerConfig: {
      layout: 'three-column-moroccan',
      countryLine: 'المملكة المغربية',
      ministryLine: 'وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل',
      includeFrenchHeader: false,
      reportTitle: 'بطاقة التشخيص التربوي والتوصيات وخطة الدعم البيداغوجي',
      reportSubtitle: 'تحليل ديداكتيكي لنتائج الفرض المحروس وبرمجة أنشطة المعالجة وفق المذكرة 142-08',
    },
    styleConfig: {
      accentColor: '#0f766e',
      secondaryAccent: '#1e3a8a',
      borderStyle: 'section-banners',
      frameStyle: 'royal-corners',
      fontFamily: 'cairo',
      showOuterFrame: true,
      tableHeaderBg: 'solid-accent',
      chartType: 'donut',
    },
    passThreshold: 10,
    excellenceThreshold: 16,
    brackets: MEMO_142_BRACKETS,
    sections: [
      { id: 'ped-meta', type: 'metadata_grid', title: 'بطاقة المعطيات التربوية للفرض', enabled: true, page: 1 },
      {
        id: 'ped-content',
        type: 'exam_content_box',
        title: '1. المضامين والكفايات المقومة ومعايير مذكرة التقويم 142-08',
        enabled: true,
        page: 1,
      },
      {
        id: 'ped-kpi',
        type: 'kpi_summary',
        title: '2. خلاصة المؤشرات الإحصائية ومعدلات التحكم',
        enabled: true,
        page: 1,
      },
      {
        id: 'ped-diag',
        type: 'pedagogical_diagnosis',
        title: '3. التشخيص الديداكتيكي للمكتسبات والتعثرات والتوصيات التربوية',
        enabled: true,
        page: 1,
      },
      {
        id: 'ped-plan',
        type: 'remediation_plan',
        title: '4. البرنامج الإجرائي للدعم والمعالجة التربوية حسب مجموعات الحاجة',
        enabled: true,
        page: 1,
      },
      {
        id: 'ped-top-low',
        type: 'top_and_struggling',
        title: '5. تفييء المتعلمين المستهدفين بالدعم الاستدراكي والتثبيت',
        enabled: true,
        page: 1,
      },
      { id: 'ped-sign', type: 'signatures', title: 'التوقيعات والتأشيرات التربوية', enabled: true, page: 1 },
    ],
    signatures: [
      {
        id: 'sig-1',
        label: 'توقيع أستاذ(ة) المادة:',
        sublabel: 'معد(ة) التشخيص التربوي وخطة الدعم',
      },
      {
        id: 'sig-2',
        label: 'تأشيرة وتوصيات المفتش(ة) التربوي(ة):',
        sublabel: 'التأطير والمواكبة التربوية',
      },
      {
        id: 'sig-3',
        label: 'تأشيرة السيد(ة) رئيس(ة) المؤسسة:',
        sublabel: 'المدير(ة) / الناظر(ة)',
      },
    ],
    pedagogicalContent: {
      generalObservation:
        'بناءً على تحليل أوراق التحرير وفق شبكة تصحيح معيارية، يتبين أن أغلبية المتعلمين تملكوا المفاهيم الأساسية للوحدة، غير أن الانتقال من التطبيق المباشر إلى الاستدلال المركب يستوجب تدخلاً ديداكتيكياً ممركزاً خلال حصة التصحيح والدعم.',
      strengths: [
        'استيعاب سليم للتعاريف والمفاهيم الرياضية الأساسية وتوظيفها في أسئلة الاسترداد (30%).',
        'تحسن ملحوظ في تنظيم خطوات الحل واحترام الترميز الرياضي السليم لدى الفئة المتحكمة.',
      ],
      weaknesses: [
        'تعثر في تفكيك الأسئلة المركبة وربط المعطيات القبلية بالنتيجة المطلوبة (مستوى التوليف 20%).',
        'أخطاء منهجية في التبرير الرياضي والاكتفاء أحياناً بإعطاء النتيجة دون خطوات استدلالية.',
      ],
      programmedRemediationBullets: [
        'استثمار حصة التصحيح في تفكيك الأخطاء النمطية جماعياً على السبورة وبناء شبكة التبرير السليم.',
        'اعتماد بيداغوجيا الخطأ والعمل بالمجموعات الصغرى لمعالجة الثغرات حسب فئات التحكم.',
        'تخصيص 10 دقائق في مستهل الحصص الموالية لأنشطة تذكيرية قصيرة (تقويم تكويني فوري).',
      ],
      remediationNotes:
        'توصية تربوية: الحرص على تنويع صيغ الأسئلة في الواجبات المنزلية لربط الحساب الجبري بالتأويل الهندسي والبياني، مع تتبع أثر المعالجة في الفرض المحروس الموالي.',
      remediationActions: [
        {
          targetGroup: 'فئة التعثر الحاد (< 05/20)',
          competencies: 'بناء التعلمات الأساس واستدراك القواعد الجبرية والهندسية الأولية',
          activity: 'أنشطة علاجية مبسطة خطوة بخطوة + بطاقات تصحيح ذاتي ومواكبة فردية',
          timeframe: 'حصة التصحيح والدعم + تتبع أسبوعي',
        },
        {
          targetGroup: 'فئة دون المتوسط (05 إلى 9.99)',
          competencies: 'تثبيت التطبيق المباشر للخاصيات وتجاوز الأخطاء الحسابية المتكررة',
          activity: 'سلسلة تمارين تطبيقية متدرجة + عمل ثنائي بتأطير من التلاميذ المتفوقين',
          timeframe: 'الأسبوعان المواليان للتصحيح',
        },
        {
          targetGroup: 'فئة التحكم المتوسط والجزئي (10 إلى 13.99)',
          competencies: 'تجويد منهجية البرهان والتحرير الرياضي الدقيق',
          activity: 'تمارين موجهة تركز على صياغة التعليل واستثمار المعطيات المركبة',
          timeframe: 'أثناء الحصص التعليمية الاعتيادية',
        },
        {
          targetGroup: 'فئة التميز والتحكم المتقدم (≥ 14/20)',
          competencies: 'تطوير مهارات التوليف وحل الوضعيات غير المألوفة',
          activity: 'مسائل إثرائية وتكليف بتنشيط مجموعات الدعم بالقرين داخل الفصل',
          timeframe: 'مستمر طيلة الدورة الدراسية',
        },
      ],
    },
  },
  {
    id: 'preset-official-classic',
    name: 'القالب الإداري الكلاسيكي الشامل (صفحة واحدة موحدة)',
    focusBadge: 'تركيز كلاسيكي: 6 فئات + مبيان أعمدة + تفييء وخطة دعم',
    useCaseTag: 'صفحة واحدة A4 · الأرشيف الإداري',
    sourceType: 'preset',
    hasTwoPages: false,
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
      accentColor: '#065f46',
      secondaryAccent: '#b45309',
      borderStyle: 'official-double',
      frameStyle: 'royal-corners',
      fontFamily: 'noto-naskh-arabic',
      showOuterFrame: true,
      tableHeaderBg: 'tinted',
      chartType: 'bar',
    },
    passThreshold: 10,
    excellenceThreshold: 16,
    brackets: DEFAULT_BRACKETS,
    sections: [
      { id: 'sec-meta', type: 'metadata_grid', title: 'أولا: المعطيات الإدارية والتربوية', enabled: true, page: 1 },
      { id: 'sec-kpi', type: 'kpi_summary', title: 'ثانيا: المؤشرات الإحصائية العامة للفرض', enabled: true, page: 1 },
      { id: 'sec-brackets', type: 'brackets_table', title: 'ثالثا: توزيع التلاميذ حسب فئات النقط', enabled: true, page: 1 },
      { id: 'sec-chart', type: 'chart_distribution', title: 'رابعا: التمثيل المبياني لتوزيع النتائج', enabled: true, page: 1 },
      { id: 'sec-top-low', type: 'top_and_struggling', title: 'خامسا: تفييء المتعلمين (المتفوقون والمحتاجون للدعم)', enabled: true, page: 1 },
      { id: 'sec-diag', type: 'pedagogical_diagnosis', title: 'سادسا: قراءة تربوية وتشخيص التعثرات المرصودة', enabled: true, page: 1 },
      { id: 'sec-remed', type: 'remediation_plan', title: 'سابعا: خطة الدعم والمعالجة المقترحة', enabled: true, page: 1 },
      { id: 'sec-list', type: 'full_students_table', title: 'ملحق: اللائحة الاسمية لنتائج التلاميذ', enabled: false, page: 2 },
      { id: 'sec-sign', type: 'signatures', title: 'التوقيعات والمصادقة', enabled: true, page: 1 },
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
  {
    id: 'preset-statistical-executive',
    name: 'القالب الإحصائي التنفيذي المختصر (لمجالس الأقسام والإدارة)',
    focusBadge: 'تركيز إحصائي: قراءة رقمية ومبيانية سريعة لمجالس الأقسام',
    useCaseTag: 'صفحة واحدة A4 · مجالس الأقسام والتقارير التركيبية',
    sourceType: 'preset',
    hasTwoPages: false,
    analysisSummary:
      'قالب تنفيذي مختصر وواضح مصمم للعرض السريع في مجالس الأقسام والتقارير الإدارية الدورية: يركز على بطاقة المعطيات، المؤشرات الإحصائية العشرة (المعدل، الوسيط، الانحراف المعياري، نسبة النجاح)، التمثيل المبياني الدائري لفئات التحكم، تفييء المتفوقين والمتعثرين، وخلاصة تركيبية مركزة.',
    detectedNotes: [
      'إخراج بصري مهوّى وعالي المقروئية يركز على الأرقام والمبيانات.',
      'يبرز مؤشرات التجانس ونسبة النجاح وتوزيع التلاميذ بنظرة واحدة.',
    ],
    headerConfig: {
      layout: 'three-column-moroccan',
      countryLine: 'المملكة المغربية',
      ministryLine: 'وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل',
      includeFrenchHeader: false,
      reportTitle: 'الحصيلة الإحصائية والتربوية الموجزة لنتائج الفرض المحروس',
      reportSubtitle: 'بطاقة تركيبية لمؤشرات التحصيل وتوزيع فئات التحكم الخاصة بمجالس الأقسام',
    },
    styleConfig: {
      accentColor: '#1e293b',
      secondaryAccent: '#0284c7',
      borderStyle: 'classic-grid',
      frameStyle: 'classic-double',
      fontFamily: 'readex-pro',
      showOuterFrame: true,
      tableHeaderBg: 'solid-accent',
      chartType: 'gauss',
    },
    passThreshold: 10,
    excellenceThreshold: 16,
    brackets: MEMO_142_BRACKETS,
    sections: [
      { id: 'exec-meta', type: 'metadata_grid', title: 'بطاقة المعطيات الإدارية للقسم والفرض', enabled: true, page: 1 },
      {
        id: 'exec-kpi',
        type: 'kpi_summary',
        title: '1. الحصيلة الإحصائية العامة ومؤشرات التشتت والتحصيل',
        enabled: true,
        page: 1,
      },
      {
        id: 'exec-split',
        type: 'brackets_and_donut_split',
        title: '2. التوزيع المبياني والنسب المئوية لفئات التحكم',
        enabled: true,
        page: 1,
      },
      {
        id: 'exec-top-low',
        type: 'top_and_struggling',
        title: '3. لائحة التلاميذ المتفوقين والتلاميذ المقترحين للدعم',
        enabled: true,
        page: 1,
      },
      {
        id: 'exec-diag',
        type: 'pedagogical_diagnosis',
        title: '4. الخلاصة التركيبية وقرارات الدعم لمجلس القسم',
        enabled: true,
        page: 1,
      },
      { id: 'exec-sign', type: 'signatures', title: 'التوقيعات والمصادقة الإدارية', enabled: true, page: 1 },
    ],
    signatures: [
      { id: 'sig-1', label: 'توقيع أستاذ(ة) المادة:', sublabel: 'معد(ة) الحصيلة الإحصائية' },
      { id: 'sig-2', label: 'تأشيرة السيد(ة) رئيس(ة) المؤسسة:', sublabel: 'رئيس(ة) مجلس القسم' },
    ],
    pedagogicalContent: {
      generalObservation:
        'تعكس المؤشرات الإحصائية للفرض مستوى تحصيل متوازن مع استقرار في نسبة الحاصلين على المعدل، ويُقترح توجيه الفئة غير المتحكمة إلى حصص الدعم المؤسساتي والمواكبة الفردية.',
      strengths: [
        'بلوغ نسبة هامة من المتعلمين عتبة التحكم الأساسي (≥ 10/20) مع تسجيل نقط متميزة في صدارة القسم.',
      ],
      weaknesses: [
        'تمركز تعثرات الفئة المتأخرة في المهارات الاستدلالية والتركيبية التي تتطلب دعماً استدراكياً.',
      ],
      programmedRemediationBullets: [
        'برمجة حصة دعم وتثبيت مركزة لفائدة التلاميذ الحاصلين على أقل من المعدل.',
        'تتبع تطور نتائج الفئة المتعثرة خلال الفروض المحروسة المقبلة.',
      ],
      remediationActions: [],
    },
  },
];

