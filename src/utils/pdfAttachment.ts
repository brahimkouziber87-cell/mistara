import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import { ExamPdfAttachment } from '../types/report';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_ATTACHMENT_PAGES = 10;
const DB_NAME = 'mistara_pedagogical_db_v1';
const STORE_NAME = 'attachments';
const ATTACHMENT_KEY = 'current_exam_pdf';
const WORKBOOK_KEY = 'current_massar_workbook';

export async function renderExamPdfAttachment(file: File): Promise<ExamPdfAttachment> {
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    throw new Error('يرجى اختيار ملف بصيغة PDF فقط.');
  }

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  const totalPages = pdfDoc.numPages;
  if (totalPages === 0) {
    throw new Error('ملف PDF المرفق فارغ ولا يحتوي على صفحات.');
  }

  const pagesToRender = Math.min(totalPages, MAX_ATTACHMENT_PAGES);
  const pageImages: string[] = [];

  for (let pageNum = 1; pageNum <= pagesToRender; pageNum += 1) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.8 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('تعذر تهيئة محرك عرض صفحات PDF في المتصفح.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      canvas,
      viewport,
    }).promise;

    pageImages.push(canvas.toDataURL('image/jpeg', 0.88));
  }

  await loadingTask.destroy();

  return {
    fileName: file.name,
    fileSize: file.size,
    pageCount: pagesToRender,
    pageImages,
    addedAt: new Date().toISOString(),
  };
}

function openAttachmentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveExamAttachmentToDb(
  attachment: ExamPdfAttachment | null
): Promise<void> {
  try {
    const db = await openAttachmentDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (attachment) {
        store.put(attachment, ATTACHMENT_KEY);
      } else {
        store.delete(ATTACHMENT_KEY);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore storage quota or private-browsing IndexedDB restrictions
  }
}

export async function loadExamAttachmentFromDb(): Promise<ExamPdfAttachment | null> {
  try {
    const db = await openAttachmentDb();
    const result = await new Promise<ExamPdfAttachment | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ATTACHMENT_KEY);
      req.onsuccess = () => {
        const val = req.result as ExamPdfAttachment | undefined;
        if (
          val &&
          typeof val.fileName === 'string' &&
          Array.isArray(val.pageImages) &&
          val.pageImages.length > 0
        ) {
          resolve(val);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function saveWorkbookToDb(
  workbook: XLSX.WorkBook | null
): Promise<void> {
  try {
    const db = await openAttachmentDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (workbook) {
        const arrayBuf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
        store.put(arrayBuf, WORKBOOK_KEY);
      } else {
        store.delete(WORKBOOK_KEY);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore IndexedDB quota/access errors
  }
}

export async function loadWorkbookFromDb(): Promise<XLSX.WorkBook | null> {
  try {
    const db = await openAttachmentDb();
    const result = await new Promise<XLSX.WorkBook | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(WORKBOOK_KEY);
      req.onsuccess = () => {
        const buf = req.result as ArrayBuffer | Uint8Array | undefined;
        if (buf) {
          try {
            const wb = XLSX.read(buf, { type: 'array' });
            resolve(wb);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}
