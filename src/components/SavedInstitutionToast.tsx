import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, RotateCcw, X } from 'lucide-react';
import {
  getSavedInstitutionSummary,
  SavedInstitutionSettings,
} from '../utils/institutionStorage';

interface SavedInstitutionToastProps {
  savedSettings: Partial<SavedInstitutionSettings> | null;
  onLoadSaved: () => void;
  onStartFresh: () => void;
  onDismiss: () => void;
}

export const SavedInstitutionToast: React.FC<SavedInstitutionToastProps> = ({
  savedSettings,
  onLoadSaved,
  onStartFresh,
  onDismiss,
}) => {
  const [status, setStatus] = useState<'prompt' | 'loaded'>('prompt');

  useEffect(() => {
    if (status !== 'loaded') return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [status, onDismiss]);

  if (!savedSettings) return null;

  const { chips, hasNamedDetails } = getSavedInstitutionSummary(savedSettings);

  const handleLoadClick = () => {
    onLoadSaved();
    setStatus('loaded');
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print step-transition fixed bottom-16 left-4 right-4 z-50 sm:bottom-6 sm:left-6 sm:right-auto sm:w-[430px]"
    >
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
        <div className="h-1 w-full bg-teal-700" />

        {status === 'loaded' ? (
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>تم تحميل بيانات المؤسسة والإعدادات المحفوظة بنجاح</span>
            </div>
            <button
              type="button"
              aria-label="إغلاق الإشعار"
              onClick={onDismiss}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">
                    تم العثور على بيانات مؤسسة محفوظة مسبقاً
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {hasNamedDetails
                      ? 'يمكنك تحميل بيانات المؤسسة والأستاذ المحفوظة في متصفحك مباشرة بدلاً من إعادة إدخالها:'
                      : 'تتوفر إعدادات مرجعية محفوظة مسبقاً في المتصفح جاهزة للتحميل المباشر:'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="إغلاق الإشعار"
                onClick={onDismiss}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 shrink-0 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {chips.length > 0 && (
              <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {chips.map((chip, idx) => (
                  <React.Fragment key={chip}>
                    {idx > 0 && (
                      <span aria-hidden="true" className="mx-1.5 text-slate-400">
                        ·
                      </span>
                    )}
                    <span className="font-semibold text-slate-800">{chip}</span>
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="mt-3.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onStartFresh}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
              >
                إدخال بيانات جديدة
              </button>
              <button
                type="button"
                onClick={handleLoadClick}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>تحميل البيانات المحفوظة</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
