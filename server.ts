import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '5mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
].filter((m): m is string => Boolean(m && m.trim()));

async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction?: string;
    responseSchema: Record<string, unknown>;
  }
) {
  let lastError: unknown = null;
  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      const supportsThinkingLevel = /^gemini-[34]/i.test(modelName) && !/lite/i.test(modelName);
      return await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: {
          ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
          ...(supportsThinkingLevel
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
        },
      });
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Only try next model if the failure is due to model not found / unsupported
      if (!/not\s*found|404|model|unsupported|invalid\s*argument/i.test(msg)) {
        throw err;
      }
    }
  }
  throw lastError || new Error('All Gemini model candidates failed');
}

function handleGeminiError(res: Response, err: unknown, fallbackMsg: string) {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Gemini API error:', message);

  if (message === 'GEMINI_API_KEY_MISSING' || /API_KEY_INVALID|403|PERMISSION_DENIED/i.test(message)) {
    return res.status(400).json({
      error: 'مفتاح Gemini API غير مضبوط أو غير صالح. يرجى التحقق من إعدادات Secrets في البيئة.',
    });
  }
  if (/429|RESOURCE_EXHAUSTED/i.test(message)) {
    return res.status(429).json({
      error: 'تم تجاوز حصة الطلبات مؤقتا. يرجى المحاولة بعد لحظات.',
    });
  }
  return res.status(500).json({ error: fallbackMsg });
}

function parseModelJson(raw: string | undefined): Record<string, unknown> {
  const trimmed = (raw || '{}')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(trimmed || '{}') as Record<string, unknown>;
}

const PEDAGOGY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    generalObservation: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
    programmedRemediationBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
    remediationNotes: { type: Type.STRING },
    remediationActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          targetGroup: { type: Type.STRING },
          competencies: { type: Type.STRING },
          activity: { type: Type.STRING },
          timeframe: { type: Type.STRING },
        },
        required: ['targetGroup', 'competencies', 'activity', 'timeframe'],
      },
    },
  },
  required: [
    'generalObservation',
    'strengths',
    'weaknesses',
    'programmedRemediationBullets',
    'remediationNotes',
    'remediationActions',
  ],
};

app.post('/api/generate-pedagogy', async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as {
      metadata?: Record<string, string>;
      language?: 'ar' | 'fr' | 'en';
      itemAnalysisSummary?: Array<{
        label: string;
        competency: string;
        maxScore: number;
        averageScore: number;
        masteryRate: number;
      }>;
      stats?: {
        total: number;
        present: number;
        absent: number;
        passed: number;
        failed: number;
        passRate: number;
        average: number;
        median: number;
        minScore: number;
        maxScore: number;
        stdDev: number;
        bracketsSummary?: Array<{ label: string; count: number; percentage: number }>;
      };
      reportTitle?: string;
      passThreshold?: number;
      excellenceThreshold?: number;
    };

    const {
      metadata,
      language = 'ar',
      itemAnalysisSummary,
      stats,
      reportTitle,
      passThreshold = 10,
      excellenceThreshold = 16,
    } = body;

    if (!stats || typeof stats !== 'object' || Number(stats.present) <= 0) {
      return res.status(400).json({
        error:
          language === 'fr'
            ? 'Veuillez importer les notes des élèves présents avant de générer le diagnostic pédagogique.'
            : language === 'en'
            ? 'Please import present student scores first to generate the pedagogical analysis.'
            : 'يرجى استيراد نقط التلاميذ الحاضرين أولاً لتوليد الصياغة التربوية.',
      });
    }

    const ai = getGeminiClient();

    const safeTotal = Number(stats.total) || 0;
    const safePresent = Number(stats.present) || 0;
    const safeAbsent = Number(stats.absent) || 0;
    const safePassed = Number(stats?.passed) || 0;
    const safePassRate = Number(stats?.passRate) || 0;
    const safeAverage = Number(stats?.average) || 0;
    const safeMedian = Number(stats?.median) || 0;
    const safeMaxScore = Number(stats?.maxScore) || 0;
    const safeMinScore = Number(stats?.minScore) || 0;
    const safeStdDev = Number(stats?.stdDev) || 0;
    const safeBrackets = Array.isArray(stats?.bracketsSummary) ? stats.bracketsSummary : [];
    const safeItems = Array.isArray(itemAnalysisSummary) ? itemAnalysisSummary : [];

    const itemLines =
      safeItems.length > 0
        ? safeItems
            .map(
              (it) =>
                `  * ${it.label} (${it.competency}): avg ${Number(it.averageScore).toFixed(2)}/${Number(it.maxScore).toFixed(1)}, mastery ${Number(it.masteryRate).toFixed(1)}%`
            )
            .join('\n')
        : '';

    let systemInstruction =
      'أنت مفتش تربوي وأستاذ مكون لمادة الرياضيات في المنظومة التربوية المغربية، ضابط للمذكرة الوزارية 142-08 والتوجيهات التربوية والأطر المرجعية لمادة الرياضيات. اكتب بلغة عربية رياضية وتربوية دقيقة خالية من الحشو.';
    let prompt = '';

    if (language === 'fr') {
      systemInstruction =
        "Tu es un inspecteur pédagogique et professeur formateur de Mathématiques au Maroc (Note ministérielle 142-08 d'évaluation, sections BIOF/APIC). Rédige en français académique et didactique rigoureux, concis et opérationnel.";
      prompt = `À partir des indicateurs statistiques réels suivants d'un devoir surveillé de Mathématiques (système éducatif marocain BIOF/APIC), rédige un diagnostic pédagogique réaliste, précis et prêt pour l'inspection :

- Titre du rapport : ${reportTitle || 'Rapport de suivi du devoir surveillé de Mathématiques'}
- Discipline : ${metadata?.subject || 'Mathématiques'}
- Niveau & Classe : ${metadata?.level || ''} (${metadata?.className || ''})
- Devoir & Semestre : ${metadata?.examNumber || ''} - ${metadata?.semester || ''}
- Référentiel pédagogique : Note ministérielle 142-08 (Mathématiques, 100% devoirs surveillés) et Orientations Pédagogiques (application directe, raisonnement/démonstration en situations familières, résolution de problèmes de synthèse).
- Effectif : ${safeTotal} | Présents : ${safePresent} | Absents : ${safeAbsent}
- Seuil de maîtrise : ${passThreshold}/20 | Seuil d'excellence : ${excellenceThreshold}/20
- Taux de réussite (≥ ${passThreshold}) : ${safePassRate.toFixed(1)}% (${safePassed} élèves)
- Moyenne de classe : ${safeAverage.toFixed(2)}/20 | Médiane : ${safeMedian.toFixed(2)}
- Note Max : ${safeMaxScore.toFixed(2)} | Note Min : ${safeMinScore.toFixed(2)} | Écart-type : ${safeStdDev.toFixed(2)}
- Tranches de notes :
${safeBrackets.map((b) => `  * ${b.label}: ${Number(b.count) || 0} élèves (${(Number(b.percentage) || 0).toFixed(1)}%)`).join('\n')}
${itemLines ? `- Analyse par exercices et compétences mathématiques :\n${itemLines}` : ''}

Exigences (en français) :
1. generalObservation : synthèse docimologique fidèle aux chiffres.
2. strengths : 3 points forts liés aux apprentissages mathématiques du niveau.
3. weaknesses : 3 difficultés didactiques en mathématiques diagnostiquées (appuyées sur les exercices faibles si fournis).
4. programmedRemediationBullets : 3 décisions de remédiation concrètes et ciblées.
5. remediationNotes : un paragraphe bref (2 lignes) sur le suivi des élèves en difficulté et l'évaluation post-remédiation.
6. remediationActions : plan différencié en 3 groupes de besoin (targetGroup, competencies, activity, timeframe).`;
    } else if (language === 'en') {
      systemInstruction =
        'You are a Mathematics pedagogical inspector and lead trainer within the Moroccan Ministry of National Education. Write in concise, formal academic English suitable for official inspection dossiers.';
      prompt = `Based on the following verified assessment metrics for a supervised Mathematics exam, draft a concise, realistic pedagogical diagnosis:

- Report Title: ${reportTitle || 'Supervised Mathematics Exam Assessment Report'}
- Subject: ${metadata?.subject || 'Mathematics'}
- Level & Class: ${metadata?.level || ''} (${metadata?.className || ''})
- Assessment & Term: ${metadata?.examNumber || ''} - ${metadata?.semester || ''}
- Enrolled: ${safeTotal} | Present: ${safePresent} | Absent: ${safeAbsent}
- Pass Threshold: ${passThreshold}/20 | Excellence Threshold: ${excellenceThreshold}/20
- Pass Rate (≥ ${passThreshold}): ${safePassRate.toFixed(1)}% (${safePassed} students)
- Class Average: ${safeAverage.toFixed(2)}/20 | Median: ${safeMedian.toFixed(2)}
- Max: ${safeMaxScore.toFixed(2)} | Min: ${safeMinScore.toFixed(2)} | Std Dev: ${safeStdDev.toFixed(2)}
- Score Brackets:
${safeBrackets.map((b) => `  * ${b.label}: ${Number(b.count) || 0} students (${(Number(b.percentage) || 0).toFixed(1)}%)`).join('\n')}
${itemLines ? `- Exercise & Mathematical Competency Breakdown:\n${itemLines}` : ''}

Output strictly in English:
1. generalObservation: concise docimological synthesis reflecting exact statistics.
2. strengths: 3 observed mathematical strengths tailored to the level.
3. weaknesses: 3 specific mathematical learning gaps (referencing low-mastery exercises if provided).
4. programmedRemediationBullets: 3 actionable remediation decisions.
5. remediationNotes: brief 2-line follow-up protocol on post-support evaluation.
6. remediationActions: 3 differentiated tiers (targetGroup, competencies, activity, timeframe).`;
    } else {
      prompt = `بناء على المعطيات الإحصائية الحقيقية التالية لفرض محروس في مادة الرياضيات بالتعليم المغربي (وفق المذكرة الوزارية 142-08 والتوجيهات التربوية للرياضيات)، صغ تحليلا تربويا واقعيا، مركزا، وبأسلوب إداري تربوي مغربي رصين (مناسب للعرض على الإدارة التربوية والمفتش التربوي):

- عنوان التقرير: ${reportTitle || 'تقرير نتائج الفرض المحروس في الرياضيات'}
- المادة: ${metadata?.subject || 'الرياضيات'}
- المستوى والقسم: ${metadata?.level || ''} (${metadata?.className || ''})
- الفرض والدورة: ${metadata?.examNumber || ''} - ${metadata?.semester || ''}
- المرجعية البيداغوجية: المذكرة الوزارية رقم 142-08 (100% فروض محروسة) والتوجيهات التربوية لمادة الرياضيات (تدرج المهارات: التطبيق المباشر، الاستدلال والبرهان في وضعيات مألوفة، وحل المسائل التوليفية؛ دقة الرموز والتأويل المبياني).
- عدد المسجلين: ${safeTotal} | الحاضرون: ${safePresent} | الغائبون: ${safeAbsent}
- عتبة التحكم المعتمدة: ${passThreshold}/20 | عتبة التميز: ${excellenceThreshold}/20
- نسبة الحاصلين على المعدل (≥ ${passThreshold}): ${safePassRate.toFixed(1)}% (${safePassed} تلميذا)
- المعدل العام للقسم: ${safeAverage.toFixed(2)} / 20 | الوسيط: ${safeMedian.toFixed(2)}
- أعلى نقطة: ${safeMaxScore.toFixed(2)} | أدنى نقطة: ${safeMinScore.toFixed(2)} | الانحراف المعياري: ${safeStdDev.toFixed(2)}
- توزيع الفئات:
${safeBrackets.map((b) => `  * ${b.label}: ${Number(b.count) || 0} تلاميذ (${(Number(b.percentage) || 0).toFixed(1)}%)`).join('\n')}
${itemLines ? `- نتائج شبكة التمارين والكفايات المقومة:\n${itemLines}` : ''}

المطلوب:
1. ملاحظة عامة دقيقة تعكس الأرقام الفعلية دون مبالغة.
2. 3 نقط قوة مرتبطة بطبيعة المادة والمستوى الدراسي.
3. 3 تعثرات ديداكتيكية مرصودة بدقة ومنسجمة مع نسبة الحاصلين على المعدل وتوزيع النقط (مع استثمار التمارين المتعثرة إن وُجدت).
4. 3 قرارات دعم ومعالجة مبرمجة موجزة وعملية (programmedRemediationBullets) وفق المذكرة التنظيمية.
5. ملاحظات المعالجة التربوية (remediationNotes): فقرة موجزة وعملية من سطرين توضح آلية تتبع التلاميذ المتعثرين وتقييم أثر الدعم البعدي.
6. خطة دعم ومعالجة عملية مقسمة إلى 3 فئات مستهدفة (مجموعات الحاجة) مع تحديد الكفايات والأنشطة والجدولة الزمنية.`;
    }

    const response = await generateWithFallback(ai, {
      contents: prompt,
      systemInstruction,
      responseSchema: PEDAGOGY_RESPONSE_SCHEMA,
    });

    const parsed = parseModelJson(response.text);
    return res.json({ pedagogicalContent: parsed });
  } catch (err) {
    return handleGeminiError(
      res,
      err,
      'تعذر توليد الصياغة التربوية تلقائيا. يمكنك تحرير الملاحظات يدويا.'
    );
  }
});

const DOCX_TEMPLATE_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    language: { type: Type.STRING },
    reportTitle: { type: Type.STRING },
    reportSubtitle: { type: Type.STRING },
    ministryLine: { type: Type.STRING },
    school: { type: Type.STRING },
    subject: { type: Type.STRING },
    teacherName: { type: Type.STRING },
    passThreshold: { type: Type.NUMBER },
    excellenceThreshold: { type: Type.NUMBER },
    enabledSectionTypes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    detectedNotes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['language', 'reportTitle', 'enabledSectionTypes', 'detectedNotes'],
};

app.post('/api/analyze-docx-template', async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as { fileName?: string; rawText?: string };
    const fileName = String(body.fileName || 'template.docx').slice(0, 120);
    const rawText = String(body.rawText || '').trim().slice(0, 8000);

    if (rawText.length < 15) {
      return res.status(400).json({
        error: 'النص المستخرج من ملف Word غير كافٍ لتحليل بنية القالب.',
      });
    }

    const ai = getGeminiClient();
    const prompt = `أنت خبير هندسة وثائق تربوية في منظومة التربية الوطنية المغربية. حلل النص التالي المستخرج من نموذج تقرير وورد (${fileName}) واستخلص بنيته لتطابق نظام تقارير مسار:

النص المستخرج:
"""
${rawText}
"""

المطلوب استخراجه بدقة في JSON:
1. language: "ar" أو "fr" أو "en" حسب لغة النموذج الغالبة.
2. reportTitle: عنوان التقرير الرئيسي كما ورد في النموذج (أو عنوان قياسي مناسب للغة).
3. reportSubtitle: العنوان الفرعي الرسمي إن وجد.
4. ministryLine, school, subject, teacherName: استخرجها فقط إن وردت صراحة في النص وإلا اتركها فارغة.
5. passThreshold (افتراضي 10) و excellenceThreshold (افتراضي 16) إذا ذكرت عتبات مختلفة.
6. enabledSectionTypes: اختر من القائمة المسموحة فقط الأقسام التي يعكسها النموذج:
   ["metadata_grid", "exam_content_box", "kpi_summary", "brackets_table", "brackets_and_donut_split", "chart_distribution", "top_and_struggling", "pedagogical_diagnosis", "remediation_plan", "dual_roster_merit", "signatures"]
7. detectedNotes: 2 إلى 3 ملاحظات موجزة بالعربية تلخص بنية النموذج المستورد.`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      responseSchema: DOCX_TEMPLATE_ANALYSIS_SCHEMA,
    });

    const parsed = parseModelJson(response.text);
    return res.json({ analysis: parsed });
  } catch (err) {
    return handleGeminiError(
      res,
      err,
      'تعذر تحليل قالب Word عبر الخادم.'
    );
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get(/.*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
