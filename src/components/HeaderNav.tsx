import React from 'react';
import { BarChart3, Check, FileDown, Loader2, Sparkles } from 'lucide-react';
import { AppStep } from '../types/report';

interface HeaderNavProps {
  activeStep: AppStep;
  onSelectStep: (step: AppStep) => void;
  onPrimaryAction: () => void;
  hasStudents: boolean;
  isExportingPdf?: boolean;
}

const WORKFLOW_TABS: {
  id: AppStep;
  stepNum?: string;
  label: string;
  isAnalytics?: boolean;
}[] = [
  { id: 'massar', stepNum: '1', label: 'استيراد مسار' },
  { id: 'customize', stepNum: '2', label: 'التشخيص والمعالجة' },
  { id: 'preview', stepNum: '3', label: 'التقرير والطباعة' },
  { id: 'analytics', label: 'التحليلات ومنحنى غوص', isAnalytics: true },
];

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeStep,
  onSelectStep,
  onPrimaryAction,
  hasStudents,
  isExportingPdf = false,
}) => {
  const activeStepIndex = WORKFLOW_TABS.findIndex((s) => s.id === activeStep);

  const primaryButtonLabel =
    activeStep === 'preview'
      ? isExportingPdf
        ? 'جاري تصدير PDF...'
        : 'تصدير PDF'
      : activeStep === 'customize'
      ? 'معاينة التقرير A4'
      : 'الانتقال للتشخيص';

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6">
        {/* Zone 1: Clean Single-Line Brand Lockup */}
        <button
          type="button"
          onClick={() => onSelectStep('massar')}
          aria-label="الصفحة الرئيسية — مِسطرة"
          className="group inline-flex items-center gap-2.5 rounded-lg py-1 pr-0.5 pl-1.5 transition-colors hover:bg-slate-50 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          <img
            src="/assets/aistudio/Sans_titre2_564d6d53.png"
            alt="شعار مِسطرة"
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-full object-contain ring-1 ring-slate-200 transition-transform group-hover:scale-[1.03]"
          />
          <span className="text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
            مِسطرة
          </span>
          <span
            aria-hidden="true"
            className="hidden lg:inline-block h-4 w-px bg-slate-200"
          />
          <span className="hidden lg:inline text-xs font-medium text-slate-500 whitespace-nowrap">
            تقارير الفروض · المذكرة 142-08 · الرياضيات
          </span>
        </button>

        {/* Zone 2: Unified 4-Destination Workflow Navigation */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex h-full items-center gap-1 lg:gap-2"
        >
          {WORKFLOW_TABS.map((tab, idx) => {
            const isActive = activeStep === tab.id;
            const isCompleted =
              hasStudents &&
              !tab.isAnalytics &&
              activeStep !== 'analytics' &&
              idx < activeStepIndex;
            const isDisabled = tab.id === 'preview' && !hasStudents;

            return (
              <React.Fragment key={tab.id}>
                {tab.isAnalytics && (
                  <span
                    aria-hidden="true"
                    className="mx-1 h-4 w-px bg-slate-200 shrink-0"
                  />
                )}
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelectStep(tab.id)}
                  className={`group relative inline-flex h-full items-center gap-2 px-2.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                    isDisabled
                      ? 'cursor-not-allowed text-slate-300'
                      : isActive
                      ? 'cursor-pointer text-teal-800'
                      : 'cursor-pointer text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.isAnalytics ? (
                    <BarChart3
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    />
                  ) : (
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold tabular-nums transition-colors ${
                        isDisabled
                          ? 'border border-slate-200 bg-slate-50 text-slate-300'
                          : isActive
                          ? 'bg-teal-700 text-white'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'border border-slate-300 bg-white text-slate-600 group-hover:border-teal-600 group-hover:text-teal-800'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      ) : (
                        tab.stepNum
                      )}
                    </span>
                  )}
                  <span>{tab.label}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-teal-700"
                    />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Zone 3: Single Crisp Contextual Primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={!hasStudents || (activeStep === 'preview' && isExportingPdf)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 sm:px-4 text-xs sm:text-[13px] font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {activeStep === 'preview' ? (
              isExportingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>{primaryButtonLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
