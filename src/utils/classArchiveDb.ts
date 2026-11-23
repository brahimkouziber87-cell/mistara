import {
  DEFAULT_METADATA,
  SAMPLE_CLASS_METADATA,
  SAMPLE_CLASS_STUDENTS,
  TEMPLATE_PRESETS,
} from '../data/presets';
import {
  ArchivedClassProject,
  ExamItemDefinition,
  ExamPdfAttachment,
  MassarMetadata,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import { computeExamStats } from './massarParser';
import { migrateLegacyMinistryLine } from './institutionStorage';

const ARCHIVE_DB_NAME = 'mistara_class_archive_db_v1';
const ARCHIVE_STORE_NAME = 'projects';
const ACTIVE_ARCHIVE_ID_KEY = 'mistara_active_archive_id_v1';

function openArchiveDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(ARCHIVE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ARCHIVE_STORE_NAME)) {
        const store = db.createObjectStore(ARCHIVE_STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getActiveArchiveId(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(ACTIVE_ARCHIVE_ID_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveArchiveId(id: string | null): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_ARCHIVE_ID_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_ARCHIVE_ID_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function buildProjectFromWorkspace(params: {
  id?: string;
  name?: string;
  createdAt?: string;
  isSample?: boolean;
  metadata: MassarMetadata;
  students: StudentRecord[];
  template: ReportTemplateSchema;
  itemDefinitions: ExamItemDefinition[];
  studentItemScores: StudentItemScores;
  examAttachment: ExamPdfAttachment | null;
}): ArchivedClassProject {
  const now = new Date().toISOString();
  const computed = computeExamStats(
    params.students,
    params.template.brackets,
    params.template.passThreshold,
    params.template.excellenceThreshold
  );
  const autoName =
    params.name?.trim() ||
    [
      params.metadata.className || 'قسم',
      params.metadata.subject || '',
      params.metadata.examNumber
        ? params.metadata.examNumber.replace('الفرض المحروس رقم ', 'ف')
        : '',
    ]
      .filter(Boolean)
      .join(' · ');

  return {
    id: params.id || `cls-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: autoName || 'ملف قسم محفوظ',
    createdAt: params.createdAt || now,
    updatedAt: now,
    isSample: params.isSample,
    metadata: { ...params.metadata },
    students: params.students.map((s) => ({ ...s })),
    template: JSON.parse(JSON.stringify(params.template)) as ReportTemplateSchema,
    itemDefinitions: params.itemDefinitions.map((it) => ({ ...it })),
    studentItemScores: JSON.parse(JSON.stringify(params.studentItemScores || {})) as StudentItemScores,
    examAttachment: params.examAttachment
      ? {
          ...params.examAttachment,
          pageImages: [...params.examAttachment.pageImages],
        }
      : null,
    summaryStats: {
      total: computed.total,
      present: computed.present,
      absent: computed.absent,
      passed: computed.passed,
      failed: computed.failed,
      passRate: computed.passRate,
      average: computed.average,
      median: computed.median,
      stdDev: computed.stdDev,
      minScore: computed.minScore,
      maxScore: computed.maxScore,
    },
  };
}

export function sanitizeImportedArchiveProject(raw: unknown): ArchivedClassProject | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || !obj.id.trim()) return null;
  if (!Array.isArray(obj.students)) return null;
  if (!obj.metadata || typeof obj.metadata !== 'object') return null;

  const validStudents: StudentRecord[] = [];
  obj.students.forEach((s, idx) => {
    if (!s || typeof s !== 'object') return;
    const rec = s as Record<string, unknown>;
    if (typeof rec.fullName !== 'string' || !rec.fullName.trim()) return;
    const isAbsent = Boolean(rec.isAbsent);
    const rawScore = rec.score;
    const score =
      isAbsent || rawScore === null || rawScore === undefined
        ? null
        : typeof rawScore === 'number' && Number.isFinite(rawScore)
        ? Math.max(0, Math.min(20, rawScore))
        : null;
    validStudents.push({
      id: typeof rec.id === 'string' && rec.id.trim() ? rec.id : `imp-${idx + 1}`,
      order: typeof rec.order === 'number' && Number.isFinite(rec.order) ? rec.order : idx + 1,
      code: typeof rec.code === 'string' ? rec.code : `IMP-${idx + 1}`,
      fullName: rec.fullName.replace(/\s+/g, ' ').trim(),
      score,
      isAbsent,
      observation: typeof rec.observation === 'string' ? rec.observation : undefined,
    });
  });

  if (validStudents.length === 0) return null;

  const rawMeta = obj.metadata as Partial<MassarMetadata>;
  const safeMeta: MassarMetadata = {
    ...DEFAULT_METADATA,
    ...Object.fromEntries(
      Object.entries(rawMeta).filter(([, v]) => typeof v === 'string')
    ),
  };

  const baseTpl = TEMPLATE_PRESETS[0];
  const rawTpl =
    obj.template && typeof obj.template === 'object'
      ? (obj.template as Partial<ReportTemplateSchema>)
      : {};
  const safeTemplate: ReportTemplateSchema = {
    ...baseTpl,
    ...rawTpl,
    passThreshold:
      typeof rawTpl.passThreshold === 'number' &&
      Number.isFinite(rawTpl.passThreshold) &&
      rawTpl.passThreshold >= 0 &&
      rawTpl.passThreshold <= 20
        ? rawTpl.passThreshold
        : baseTpl.passThreshold,
    excellenceThreshold:
      typeof rawTpl.excellenceThreshold === 'number' &&
      Number.isFinite(rawTpl.excellenceThreshold) &&
      rawTpl.excellenceThreshold >= 0 &&
      rawTpl.excellenceThreshold <= 20
        ? rawTpl.excellenceThreshold
        : baseTpl.excellenceThreshold,
    brackets:
      Array.isArray(rawTpl.brackets) && rawTpl.brackets.length > 0
        ? rawTpl.brackets
        : baseTpl.brackets,
    sections:
      Array.isArray(rawTpl.sections) && rawTpl.sections.length > 0
        ? rawTpl.sections
        : baseTpl.sections,
    signatures:
      Array.isArray(rawTpl.signatures) && rawTpl.signatures.length > 0
        ? rawTpl.signatures
        : baseTpl.signatures,
    headerConfig: {
      ...baseTpl.headerConfig,
      ...(rawTpl.headerConfig || {}),
      ministryLine:
        typeof rawTpl.headerConfig?.ministryLine === 'string' &&
        rawTpl.headerConfig.ministryLine.trim()
          ? migrateLegacyMinistryLine(rawTpl.headerConfig.ministryLine)
          : baseTpl.headerConfig.ministryLine,
    },
    styleConfig: {
      ...baseTpl.styleConfig,
      ...(rawTpl.styleConfig || {}),
    },
    pedagogicalContent: {
      ...baseTpl.pedagogicalContent,
      ...(rawTpl.pedagogicalContent || {}),
      strengths: Array.isArray(rawTpl.pedagogicalContent?.strengths)
        ? rawTpl.pedagogicalContent.strengths.map(String)
        : baseTpl.pedagogicalContent.strengths,
      weaknesses: Array.isArray(rawTpl.pedagogicalContent?.weaknesses)
        ? rawTpl.pedagogicalContent.weaknesses.map(String)
        : baseTpl.pedagogicalContent.weaknesses,
      programmedRemediationBullets: Array.isArray(
        rawTpl.pedagogicalContent?.programmedRemediationBullets
      )
        ? rawTpl.pedagogicalContent.programmedRemediationBullets.map(String)
        : baseTpl.pedagogicalContent.programmedRemediationBullets,
      remediationActions: Array.isArray(rawTpl.pedagogicalContent?.remediationActions)
        ? rawTpl.pedagogicalContent.remediationActions
        : baseTpl.pedagogicalContent.remediationActions,
    },
  };

  const safeItems: ExamItemDefinition[] = Array.isArray(obj.itemDefinitions)
    ? obj.itemDefinitions.filter(
        (it): it is ExamItemDefinition =>
          Boolean(
            it &&
              typeof it === 'object' &&
              typeof (it as ExamItemDefinition).id === 'string' &&
              typeof (it as ExamItemDefinition).label === 'string' &&
              typeof (it as ExamItemDefinition).maxScore === 'number'
          )
      )
    : [];

  const safeItemScores: StudentItemScores =
    obj.studentItemScores && typeof obj.studentItemScores === 'object'
      ? (obj.studentItemScores as StudentItemScores)
      : {};

  const rawAtt = obj.examAttachment as Partial<ExamPdfAttachment> | null | undefined;
  const safeAttachment: ExamPdfAttachment | null =
    rawAtt &&
    typeof rawAtt === 'object' &&
    typeof rawAtt.fileName === 'string' &&
    Array.isArray(rawAtt.pageImages)
      ? {
          fileName: rawAtt.fileName,
          fileSize: typeof rawAtt.fileSize === 'number' && Number.isFinite(rawAtt.fileSize) ? rawAtt.fileSize : 0,
          pageCount: typeof rawAtt.pageCount === 'number' ? rawAtt.pageCount : rawAtt.pageImages.length,
          pageImages: rawAtt.pageImages.filter(
            (img): img is string => typeof img === 'string' && img.startsWith('data:image/')
          ),
          addedAt: typeof rawAtt.addedAt === 'string' ? rawAtt.addedAt : new Date().toISOString(),
        }
      : null;

  return buildProjectFromWorkspace({
    id: obj.id.trim(),
    name: typeof obj.name === 'string' ? obj.name : undefined,
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : undefined,
    isSample: Boolean(obj.isSample),
    metadata: safeMeta,
    students: validStudents,
    template: safeTemplate,
    itemDefinitions: safeItems,
    studentItemScores: safeItemScores,
    examAttachment: safeAttachment,
  });
}

export async function listArchivedProjects(): Promise<ArchivedClassProject[]> {
  try {
    const db = await openArchiveDb();
    const list = await new Promise<ArchivedClassProject[]>((resolve, reject) => {
      const tx = db.transaction(ARCHIVE_STORE_NAME, 'readonly');
      const store = tx.objectStore(ARCHIVE_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result)
          ? (req.result as ArchivedClassProject[])
          : [];
        rows.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return list;
  } catch {
    return [];
  }
}

export async function saveArchivedProject(
  project: ArchivedClassProject
): Promise<ArchivedClassProject[]> {
  try {
    const db = await openArchiveDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ARCHIVE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ARCHIVE_STORE_NAME);
      store.put(project);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore DB errors cleanly
  }
  return listArchivedProjects();
}

export async function loadArchivedProject(
  id: string
): Promise<ArchivedClassProject | null> {
  try {
    const db = await openArchiveDb();
    const result = await new Promise<ArchivedClassProject | null>((resolve, reject) => {
      const tx = db.transaction(ARCHIVE_STORE_NAME, 'readonly');
      const store = tx.objectStore(ARCHIVE_STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as ArchivedClassProject) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function deleteArchivedProject(
  id: string
): Promise<ArchivedClassProject[]> {
  try {
    const db = await openArchiveDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ARCHIVE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ARCHIVE_STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    if (getActiveArchiveId() === id) {
      setActiveArchiveId(null);
    }
  } catch {
    // Ignore DB errors
  }
  return listArchivedProjects();
}

export async function renameArchivedProject(
  id: string,
  newName: string
): Promise<ArchivedClassProject[]> {
  const existing = await loadArchivedProject(id);
  if (!existing || !newName.trim()) return listArchivedProjects();
  return saveArchivedProject({
    ...existing,
    name: newName.trim(),
    updatedAt: new Date().toISOString(),
  });
}

export async function duplicateArchivedProject(
  id: string
): Promise<{ list: ArchivedClassProject[]; duplicated: ArchivedClassProject | null }> {
  const existing = await loadArchivedProject(id);
  if (!existing) return { list: await listArchivedProjects(), duplicated: null };
  const now = new Date().toISOString();
  const copy: ArchivedClassProject = {
    ...JSON.parse(JSON.stringify(existing)),
    id: `cls-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${existing.name} (نسخة)`,
    createdAt: now,
    updatedAt: now,
  };
  const list = await saveArchivedProject(copy);
  return { list, duplicated: copy };
}

export async function createDemoLongitudinalCohort(
  baseMeta: MassarMetadata,
  baseTemplate: ReportTemplateSchema
): Promise<ArchivedClassProject[]> {
  const sampleMeta: MassarMetadata = {
    ...baseMeta,
    academy: baseMeta.academy || SAMPLE_CLASS_METADATA.academy || '',
    directorate: baseMeta.directorate || SAMPLE_CLASS_METADATA.directorate || '',
    school: baseMeta.school || SAMPLE_CLASS_METADATA.school || '',
    schoolYear: baseMeta.schoolYear || SAMPLE_CLASS_METADATA.schoolYear || '2025/2026',
    cycle: baseMeta.cycle || SAMPLE_CLASS_METADATA.cycle || 'السلك الثانوي التأهيلي',
    level: SAMPLE_CLASS_METADATA.level || baseMeta.level || 'الجذع المشترك العلمي - خيار فرنسية',
    subject: baseMeta.subject || SAMPLE_CLASS_METADATA.subject || 'الرياضيات',
    teacherName: baseMeta.teacherName || SAMPLE_CLASS_METADATA.teacherName || 'إبراهيم قزيبر',
    semester: 'الدورة الأولى',
  };

  const f1Students = SAMPLE_CLASS_STUDENTS.map((s) => ({ ...s }));
  const f2Students = SAMPLE_CLASS_STUDENTS.map((s, i) => {
    if (s.isAbsent) {
      return { ...s, isAbsent: false, score: 11.25, observation: 'تم تدارك الغياب بعد الدعم' };
    }
    const boost = s.score !== null && s.score < 10 ? 2.25 : (i % 3 === 0 ? 0.75 : 0.25);
    const nextScore = Math.round(Math.min(19.75, Math.max(4, (s.score ?? 10) + boost)) * 100) / 100;
    return { ...s, score: nextScore };
  });
  const f3Students = SAMPLE_CLASS_STUDENTS.map((s, i) => {
    if (s.isAbsent) return { ...s, isAbsent: false, score: 12.5 };
    const boost = s.score !== null && s.score < 10 ? 3.5 : (i % 2 === 0 ? 1.0 : -0.25);
    const nextScore = Math.round(Math.min(20, Math.max(5.5, (s.score ?? 10) + boost)) * 100) / 100;
    return { ...s, score: nextScore };
  });

  const altClassStudents = SAMPLE_CLASS_STUDENTS.map((s, i) => {
    if (i === 4) return { ...s, isAbsent: true, score: null, observation: 'غياب غير مبرر' };
    if (s.isAbsent) return { ...s, isAbsent: false, score: 9.25 };
    const shift = i % 2 === 0 ? -1.25 : 0.75;
    const nextScore = Math.round(Math.min(19.5, Math.max(3.5, (s.score ?? 10) + shift)) * 100) / 100;
    return { ...s, score: nextScore };
  });

  const tpl = baseTemplate || TEMPLATE_PRESETS[0];

  const demoItems: ExamItemDefinition[] = [
    {
      id: 'it-1',
      label: 'التمرين 1',
      competency: 'الحسابيات والعمليات الأساسية والتطبيق المباشر',
      maxScore: 6,
      remediationTask: 'مراجعة قواعد الحساب والتفكيك إلى جداء عوامل أولية (بطاقة 1)',
    },
    {
      id: 'it-2',
      label: 'التمرين 2',
      competency: 'التمثيل المتجهي وتوظيف خاصية شال في المستوى',
      maxScore: 7,
      remediationTask: 'إنجاز تمارين الإنشاء الهندسي وتبسيط المجاميع المتجهية',
    },
    {
      id: 'it-3',
      label: 'التمرين 3',
      competency: 'الإسقاط والبرهنة على التوازي واستقامية النقط',
      maxScore: 7,
      remediationTask: 'التمرن على صياغة البرهنة المتدرجة عبر وضعيات مألوفة',
    },
  ];

  const makeItemScores = (studs: StudentRecord[]): StudentItemScores => {
    const out: StudentItemScores = {};
    for (const st of studs) {
      if (st.isAbsent || st.score === null) continue;
      const ratio = st.score / 20;
      const s1 = Math.round(Math.min(6, Math.max(0, ratio * 6 + 0.5)) * 4) / 4;
      const s2 = Math.round(Math.min(7, Math.max(0, ratio * 7)) * 4) / 4;
      const s3 = Math.round(Math.min(7, Math.max(0, st.score - s1 - s2)) * 4) / 4;
      out[st.id] = { 'it-1': s1, 'it-2': s2, 'it-3': s3 };
    }
    return out;
  };

  const p1 = buildProjectFromWorkspace({
    id: 'demo-tcsf2-f1',
    name: 'TCSF-2 · ف1 (نموذج تتبع)',
    metadata: {
      ...sampleMeta,
      className: 'TCSF-2',
      examNumber: 'الفرض المحروس رقم 1',
      examDate: '2025-11-04',
      correctionDate: '2025-11-10',
    },
    students: f1Students,
    template: tpl,
    itemDefinitions: demoItems,
    studentItemScores: makeItemScores(f1Students),
    examAttachment: null,
    isSample: true,
  });

  const p2 = buildProjectFromWorkspace({
    id: 'demo-tcsf2-f2',
    name: 'TCSF-2 · ف2 (نموذج تتبع)',
    metadata: {
      ...sampleMeta,
      className: 'TCSF-2',
      examNumber: 'الفرض المحروس رقم 2',
      examDate: '2025-12-12',
      correctionDate: '2025-12-18',
    },
    students: f2Students,
    template: tpl,
    itemDefinitions: demoItems,
    studentItemScores: makeItemScores(f2Students),
    examAttachment: null,
    isSample: true,
  });

  const p3 = buildProjectFromWorkspace({
    id: 'demo-tcsf2-f3',
    name: 'TCSF-2 · ف3 (نموذج تتبع)',
    metadata: {
      ...sampleMeta,
      className: 'TCSF-2',
      examNumber: 'الفرض المحروس رقم 3',
      examDate: '2026-01-14',
      correctionDate: '2026-01-20',
    },
    students: f3Students,
    template: tpl,
    itemDefinitions: demoItems,
    studentItemScores: makeItemScores(f3Students),
    examAttachment: null,
    isSample: true,
  });

  const pAlt = buildProjectFromWorkspace({
    id: 'demo-tcsf1-f1',
    name: 'TCSF-1 · ف1 (للمقارنة بالمجلس)',
    metadata: {
      ...sampleMeta,
      className: 'TCSF-1',
      examNumber: 'الفرض المحروس رقم 1',
      examDate: '2025-11-05',
      correctionDate: '2025-11-11',
    },
    students: altClassStudents,
    template: tpl,
    itemDefinitions: demoItems,
    studentItemScores: makeItemScores(altClassStudents),
    examAttachment: null,
    isSample: true,
  });

  await saveArchivedProject(p1);
  await saveArchivedProject(p2);
  await saveArchivedProject(p3);
  return saveArchivedProject(pAlt);
}
