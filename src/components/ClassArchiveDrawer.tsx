import React, { useEffect, useState } from 'react';
import {
  Archive,
  Check,
  Copy,
  Download,
  FolderOpen,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ArchivedClassProject } from '../types/report';
import { sanitizeImportedArchiveProject } from '../utils/classArchiveDb';

interface ClassArchiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ArchivedClassProject[];
  activeArchiveId: string | null;
  hasActiveStudents: boolean;
  activeClassSummaryLabel: string;
  onSaveCurrentToArchive: (asNewSnapshot?: boolean) => Promise<void>;
  onLoadArchivedProject: (project: ArchivedClassProject) => void;
  onRenameArchivedProject: (id: string, newName: string) => Promise<void>;
  onDuplicateArchivedProject: (id: string) => Promise<void>;
  onDeleteArchivedProject: (id: string) => Promise<void>;
  onImportArchiveProjects: (projects: ArchivedClassProject[]) => Promise<void>;
  onStartNewEmptyWorkspace: () => void;
}

export const ClassArchiveDrawer: React.FC<ClassArchiveDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  activeArchiveId,
  hasActiveStudents,
  activeClassSummaryLabel,
  onSaveCurrentToArchive,
  onLoadArchivedProject,
  onRenameArchivedProject,
  onDuplicateArchivedProject,
  onDeleteArchivedProject,
  onImportArchiveProjects,
  onStartNewEmptyWorkspace,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPendingDeleteId(null);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId) {
          setEditingId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, editingId, onClose]);

  if (!isOpen) return null;

  const filtered = projects.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.metadata.className || '').toLowerCase().includes(q) ||
      (p.metadata.subject || '').toLowerCase().includes(q) ||
      (p.metadata.examNumber || '').toLowerCase().includes(q)
    );
  });

  const handleSave = async (asNew: boolean) => {
    setIsBusy(true);
    setStatusMessage(null);
    try {
      await onSaveCurrentToArchive(asNew);
      setStatusMessage(
        asNew
          ? 'تم حفظ لقطة جديدة من القسم في الأرشيف المحلي بنجاح.'
          : 'تم حفظ وتحديث ملف القسم في الأرشيف بنجاح.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportJsonBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: 'mistara-class-archive-v1',
      projects,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `أرشيف_الأقسام_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleImportJsonBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { projects?: unknown[] } | unknown[];
      const incoming = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray(parsed.projects)
        ? parsed.projects
        : [];
      const valid = incoming
        .map((item) => sanitizeImportedArchiveProject(item))
        .filter((p): p is ArchivedClassProject => p !== null);
      if (valid.length === 0) {
        setStatusMessage('الملف المحدد لا يحتوي على سجلات أقسام صالحة.');
        return;
      }
      await onImportArchiveProjects(valid);
      setStatusMessage(`تم استيراد ${valid.length} ملف(ات) قسم إلى الأرشيف المحلي.`);
    } catch {
      setStatusMessage('تعذر قراءة ملف النسخة الاحتياطية JSON.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="أرشيف الأقسام والفروض المتعدد"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="no-print fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]"
    >
      <div className="flex h-full w-full max-w-xl flex-col border-r border-slate-200 bg-white shadow-xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700">
              <Archive className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                أرشيف الأقسام والفروض المتعدد
              </h2>
              <p className="text-xs text-slate-500">
                حفظ وتبديل ملفات الأقسام والدورات محلياً في المتصفح (IndexedDB)
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="إغلاق الأرشيف"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Save Active Workspace Bar */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700 truncate">
              المساحة النشطة:{' '}
              <strong className="text-slate-900">
                {activeClassSummaryLabel || 'لا يوجد قسم محمّل حالياً'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => {
                onStartNewEmptyWorkspace();
                onClose();
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              بدء قسم جديد فارغ
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!hasActiveStudents || isBusy}
              onClick={() => void handleSave(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              {activeArchiveId ? 'حفظ التعديلات في الملف النشط' : 'حفظ القسم الحالي في الأرشيف'}
            </button>

            {activeArchiveId && hasActiveStudents && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleSave(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-teal-700" />
                حفظ كلقطة فرض جديدة
              </button>
            )}
          </div>

          {statusMessage && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Search & Backup Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-2.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم القسم أو المادة أو الفرض..."
            className="flex-1 min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={projects.length === 0}
              onClick={handleExportJsonBackup}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-3 w-3" />
              تصدير نسخة JSON
            </button>
            <label className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer">
              <Upload className="h-3 w-3" />
              <span>استيراد JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportJsonBackup(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        {/* Saved Projects List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
              <FolderOpen className="mx-auto mb-2 h-8 w-8 text-slate-400" strokeWidth={1.6} />
              <div className="text-sm font-bold text-slate-800">
                {projects.length === 0
                  ? 'لا توجد أقسام محفوظة في الأرشيف بعد'
                  : 'لا توجد نتائج مطابقة للبحث'}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                استورد لائحة تلاميذ من مسار ثم اضغط «حفظ القسم الحالي في الأرشيف» لتخزين الفروض والمقارنة بينها لاحقاً.
              </p>
            </div>
          ) : (
            filtered.map((proj) => {
              const isCurrent = proj.id === activeArchiveId;
              const isEditing = editingId === proj.id;

              return (
                <div
                  key={proj.id}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    isCurrent
                      ? 'border-teal-700 bg-teal-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                await onRenameArchivedProject(proj.id, editingName);
                                setEditingId(null);
                              } else if (e.key === 'Escape') {
                                e.stopPropagation();
                                setEditingId(null);
                              }
                            }}
                            className="flex-1 rounded border border-teal-700 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await onRenameArchivedProject(proj.id, editingName);
                              setEditingId(null);
                            }}
                            className="rounded bg-teal-700 p-1 text-white hover:bg-teal-800 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-slate-900">
                            {proj.name}
                          </h3>
                          {isCurrent && (
                            <span className="text-[11px] font-bold text-teal-800">
                              · نشط حالياً
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span>{proj.metadata.className || '—'}</span>
                        <span>·</span>
                        <span>{proj.metadata.subject || 'المادة'}</span>
                        <span>·</span>
                        <span>{proj.metadata.examNumber}</span>
                        <span>·</span>
                        <span>{proj.metadata.semester}</span>
                      </div>
                    </div>

                    <div className="text-left font-mono tabular-nums shrink-0">
                      <div className="text-sm font-extrabold text-teal-800">
                        {proj.summaryStats.average.toFixed(2)}/20
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {proj.summaryStats.passRate.toFixed(0)}% · {proj.summaryStats.total} ت
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <span className="font-mono text-[10.5px] text-slate-400">
                      آخر تحديث: {proj.updatedAt.slice(0, 10)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadArchivedProject(proj);
                          onClose();
                        }}
                        className="rounded-md bg-teal-700 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        فتح ومعاينة
                      </button>
                      <button
                        type="button"
                        title="تغيير الاسم"
                        onClick={() => {
                          setEditingId(proj.id);
                          setEditingName(proj.name);
                        }}
                        className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="نسخ الملف"
                        onClick={() => void onDuplicateArchivedProject(proj.id)}
                        className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {pendingDeleteId === proj.id ? (
                        <div className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={async () => {
                              setPendingDeleteId(null);
                              await onDeleteArchivedProject(proj.id);
                            }}
                            className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-red-700 cursor-pointer"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(null)}
                            className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-white cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          title="حذف من الأرشيف"
                          onClick={() => setPendingDeleteId(proj.id)}
                          className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
