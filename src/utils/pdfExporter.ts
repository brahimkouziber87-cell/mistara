import { jsPDF } from 'jspdf';
import { domToCanvas } from 'modern-screenshot';

export interface ExportPdfOptions {
  container: HTMLElement;
  fileName: string;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Restrict copied computed styles to the exact properties used by report sheets.
// This avoids reading ~380 computed properties + pseudo-elements per DOM node (18x faster).
const REPORT_STYLE_PROPERTIES: string[] = [
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'z-index',
  'box-sizing',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'overflow',
  'overflow-x',
  'overflow-y',
  'flex',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'justify-content',
  'align-items',
  'align-content',
  'align-self',
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-column-start',
  'grid-column-end',
  'grid-row',
  'grid-row-start',
  'grid-row-end',
  'gap',
  'row-gap',
  'column-gap',
  'border-collapse',
  'border-spacing',
  'table-layout',
  'vertical-align',
  'direction',
  'unicode-bidi',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant-numeric',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration',
  'text-decoration-line',
  'text-overflow',
  'white-space',
  'word-break',
  'overflow-wrap',
  'color',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'opacity',
  'box-shadow',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'list-style-type',
  'list-style-position',
  'object-fit',
  'object-position',
  'fill',
  'stroke',
  'stroke-width',
  'transform',
  'transform-origin',
];

let cachedFontCssPromise: Promise<string> | null = null;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchUrlAsDataUrlWithTimeout(url: string, timeoutMs = 2000): Promise<string | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'force-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function buildEmbeddedFontCss(): Promise<string> {
  if (typeof document === 'undefined' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return '';
  }

  const fontFaceRules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSFontFaceRule) {
          fontFaceRules.push(rule.cssText);
        }
      }
    } catch {
      // Ignore cross-origin stylesheets without CORS access
    }
  }

  if (fontFaceRules.length === 0) return '';

  const urlRegex = /url\((['"]?)([^'")]+)\1\)/g;
  const uniqueUrls = new Set<string>();
  for (const cssText of fontFaceRules) {
    let match: RegExpExecArray | null;
    urlRegex.lastIndex = 0;
    while ((match = urlRegex.exec(cssText)) !== null) {
      const rawUrl = match[2];
      if (rawUrl && !rawUrl.startsWith('data:')) {
        uniqueUrls.add(rawUrl);
      }
    }
  }

  const urlToDataMap = new Map<string, string>();
  await Promise.all(
    Array.from(uniqueUrls).map(async (url) => {
      const dataUrl = await fetchUrlAsDataUrlWithTimeout(url, 2000);
      if (dataUrl) {
        urlToDataMap.set(url, dataUrl);
      }
    })
  );

  if (urlToDataMap.size === 0) return '';

  return fontFaceRules
    .map((ruleText) =>
      ruleText.replace(urlRegex, (fullMatch, _quote, rawUrl) => {
        const replacement = urlToDataMap.get(rawUrl);
        return replacement ? `url("${replacement}")` : fullMatch;
      })
    )
    .join('\n');
}

function getEmbeddedFontCss(): Promise<string> {
  if (!cachedFontCssPromise) {
    cachedFontCssPromise = Promise.race([
      buildEmbeddedFontCss(),
      new Promise<string>((resolve) => window.setTimeout(() => resolve(''), 2500)),
    ]).catch(() => '');
  }
  return cachedFontCssPromise;
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(resolve, 25);
    });
  });

export async function exportReportContainerToPdf({
  container,
  fileName,
}: ExportPdfOptions): Promise<void> {
  // Yield one frame so the loading spinner renders immediately before DOM capture work starts
  await nextFrame();

  if (typeof document !== 'undefined' && 'fonts' in document) {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
    ]);
  }

  const sheets = Array.from(
    container.querySelectorAll<HTMLElement>('.report-sheet')
  );

  if (sheets.length === 0) {
    throw new Error('لم يتم العثور على صفحات التقرير لتصديرها.');
  }

  const fontCssText = await getEmbeddedFontCss();

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const prevTransform = container.style.transform;
  const prevTransition = container.style.transition;
  container.style.transition = 'none';
  container.style.transform = 'none';

  try {
    await nextFrame();

    let isFirstPage = true;

    for (const sheet of sheets) {
      const capturePromise = domToCanvas(sheet, {
        scale: 2,
        backgroundColor: '#ffffff',
        timeout: 6000,
        width: sheet.offsetWidth,
        height: sheet.offsetHeight,
        includeStyleProperties: REPORT_STYLE_PROPERTIES,
        features: {
          copyScrollbar: false,
        },
        font: fontCssText ? { cssText: fontCssText } : false,
        style: {
          margin: '0',
          boxShadow: 'none',
          transform: 'none',
        },
      });

      const canvas = await Promise.race([
        capturePromise,
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () =>
              reject(
                new Error(
                  'استغرق تجهيز صفحة التقرير وقتاً أطول من المعتاد. يرجى استخدام خيار «طباعة A4» كبديل سريع.'
                )
              ),
            15000
          )
        ),
      ]);

      if (!isFirstPage) {
        pdf.addPage('a4', 'portrait');
      }

      const naturalHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;
      // Use high-quality JPEG on solid white background for ~20x faster PDF encoding than raw PNG deflate
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      if (naturalHeightMm <= A4_HEIGHT_MM) {
        pdf.addImage(
          dataUrl,
          'JPEG',
          0,
          0,
          A4_WIDTH_MM,
          naturalHeightMm,
          undefined,
          'FAST'
        );
      } else {
        const scaleFactor = A4_HEIGHT_MM / naturalHeightMm;
        const fittedWidthMm = A4_WIDTH_MM * scaleFactor;
        const offsetX = (A4_WIDTH_MM - fittedWidthMm) / 2;
        pdf.addImage(
          dataUrl,
          'JPEG',
          offsetX,
          0,
          fittedWidthMm,
          A4_HEIGHT_MM,
          undefined,
          'FAST'
        );
      }

      isFirstPage = false;
      await nextFrame();
    }
  } finally {
    container.style.transform = prevTransform;
    container.style.transition = prevTransition;
  }

  const safeName = fileName.replace(/[\\/:*?"<>|]+/g, '_');
  const finalFileName = safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`;

  const pdfBlob = pdf.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = finalFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 10000);
}

export async function exportElementToPng({
  container,
  fileName,
}: ExportPdfOptions): Promise<void> {
  await nextFrame();

  if (typeof document !== 'undefined' && 'fonts' in document) {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
    ]);
  }

  const target =
    container.querySelector<HTMLElement>('.report-sheet') || container;

  const fontCssText = await getEmbeddedFontCss();

  const prevTransform = container.style.transform;
  const prevTransition = container.style.transition;
  container.style.transition = 'none';
  container.style.transform = 'none';

  try {
    await nextFrame();

    const capturePromise = domToCanvas(target, {
      scale: 2,
      backgroundColor: '#ffffff',
      timeout: 8000,
      width: target.offsetWidth,
      height: target.offsetHeight,
      includeStyleProperties: REPORT_STYLE_PROPERTIES,
      features: {
        copyScrollbar: false,
      },
      font: fontCssText ? { cssText: fontCssText } : false,
      style: {
        margin: '0',
        boxShadow: 'none',
        transform: 'none',
      },
    });

    const canvas = await Promise.race([
      capturePromise,
      new Promise<never>((_, reject) =>
        window.setTimeout(
          () =>
            reject(
              new Error(
                'استغرق تجهيز صورة التحليلات وقتاً أطول من المعتاد. يرجى المحاولة مجدداً.'
              )
            ),
          15000
        )
      ),
    ]);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('تعذر توليد ملف الصورة PNG.'))),
        'image/png',
        1.0
      );
    });

    const safeName = fileName.replace(/[\\/:*?"<>|]+/g, '_');
    const finalFileName = safeName.endsWith('.png') ? safeName : `${safeName}.png`;

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 10000);
  } finally {
    container.style.transform = prevTransform;
    container.style.transition = prevTransition;
  }
}

