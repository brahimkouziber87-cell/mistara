import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { StudentRecord } from '../types/report';

interface AbsentStudentsPanelProps {
  students: StudentRecord[];
  absentStudents: StudentRecord[];
  onAddAbsentStudents: (
    entries: Array<{ fullName: string; observation?: string }>
  ) => void;
  onUpdateObservation: (id: string, observation: string) => void;
  onRestorePresent: (id: string) => void;
  onRemoveStudent: (id: string) => void;
}

export const AbsentStudentsPanel: React.FC<AbsentStudentsPanelProps> = ({
  students,
  absentStudents,
  onAddAbsentStudents,
  onUpdateObservation,
  onRestorePresent,
  onRemoveStudent,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(() => absentStudents.length > 0);
  const prevAbsentCountRef = useRef<number>(absentStudents.length);
  const [singleName, setSingleName] = useState('');
  const [singleNote, setSingleNote] = useState('');
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    if (prevAbsentCountRef.current === 0 && absentStudents.length > 0) {
      setIsOpen(true);
    }
    prevAbsentCountRef.current = absentStudents.length;
  }, [absentStudents.length]);

  const presentStudents = students.filter((s) => !s.isAbsent);

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = singleName.trim();
    if (!trimmed) return;
    onAddAbsentStudents([
      {
        fullName: trimmed,
        observation: singleNote.trim() || undefined,
      },
    ]);
    setSingleName('');
    setSingleNote('');
    setIsOpen(true);
  };

  const handleBulkSubmit = () => {
    const names = bulkText
      .split(/\r?\n|,|،/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    onAddAbsentStudents(
      names.map((fullName) => ({
        fullName,
        observation: singleNote.trim() || undefined,
      }))
    );
    setBulkText('');
    setShowBulkMode(false);
    setIsOpen(true);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            إدارة التلاميذ المتغيبين عن الفرض
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            <span>عدد المتغيبين المسجلين: {absentStudents.length}</span>
            <span aria-hidden="true"> · </span>
            <span>يُمنح الغائب نقطة 0.00 في جدول الترتيب الاستحقاقي مع حفظ صفة الغياب</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOpen && (
            <button
              type="button"
              onClick={() => setShowBulkMode((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-teal-700" />
              {showBulkMode ? 'الإدخال الفردي' : 'إدخال عدة أسماء دفعة واحدة'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isOpen ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                طي اللوحة
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                {absentStudents.length > 0
                  ? `عرض وتعديل المتغيبين (${absentStudents.length})`
                  : 'إضافة تلميذ متغيب'}
              </>
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {!showBulkMode ? (
            <form
              onSubmit={handleSingleSubmit}
              className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end"
            >
              <div className="sm:col-span-5">
                <label
                  htmlFor="absent-student-name"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  اسم التلميذ(ة) المتغيب(ة)
                </label>
                <input
                  id="absent-student-name"
                  type="text"
                  list="present-students-datalist"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="اكتب الاسم الكامل أو اختر من اللائحة..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none transition-colors"
                />
                <datalist id="present-students-datalist">
                  {presentStudents.map((st) => {
                    const normalized = st.fullName.replace(/\s+/g, ' ').trim().toLowerCase();
                    const isDuplicate =
                      students.filter(
                        (other) =>
                          other.fullName.replace(/\s+/g, ' ').trim().toLowerCase() === normalized
                      ).length > 1;
                    const optionValue = isDuplicate
                      ? `#${st.order} - ${st.fullName}`
                      : st.fullName;
                    return (
                      <option key={st.id} value={optionValue}>
                        {st.code ? `رمز: ${st.code}` : ''}
                      </option>
                    );
                  })}
                </datalist>
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="absent-student-note"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  صفة الغياب / ملاحظة (اختياري)
                </label>
                <input
                  id="absent-student-note"
                  type="text"
                  list="absence-reasons-datalist"
                  value={singleNote}
                  onChange={(e) => setSingleNote(e.target.value)}
                  placeholder="مثال: غياب مبرر، غياب غير مبرر..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none transition-colors"
                />
                <datalist id="absence-reasons-datalist">
                  <option value="غياب مبرر" />
                  <option value="غياب غير مبرر" />
                  <option value="مبرر طبي" />
                </datalist>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={!singleName.trim()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  إضافة للمتغيبين
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="bulk-absent-names"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  أسماء التلاميذ المتغيبين (اسم واحد في كل سطر، أو مفصولة بفاصلة)
                </label>
                <textarea
                  id="bulk-absent-names"
                  rows={3}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={'مثال:\nسعد العلمي\nخديجة المرابط\nيوسف العلوي'}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  type="text"
                  value={singleNote}
                  onChange={(e) => setSingleNote(e.target.value)}
                  placeholder="ملاحظة مشتركة للجميع (اختياري، مثال: غياب غير مبرر)"
                  className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  disabled={!bulkText.trim()}
                  onClick={handleBulkSubmit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  إضافة القائمة للمتغيبين
                </button>
              </div>
            </div>
          )}

          {absentStudents.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-center w-14">ر.ت</th>
                    <th className="px-3 py-2">اسم التلميذ(ة) المتغيب(ة)</th>
                    <th className="px-3 py-2 w-60">صفة الغياب / ملاحظة</th>
                    <th className="px-3 py-2 text-center w-44">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {absentStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-center font-mono text-xs tabular-nums text-slate-500">
                        #{st.order}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        <span className="inline-flex items-center gap-1.5">
                          <UserX className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                          {st.fullName}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={st.observation || ''}
                          onChange={(e) => onUpdateObservation(st.id, e.target.value)}
                          placeholder="أضف مبررا أو ملاحظة..."
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none transition-colors"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onRestorePresent(st.id)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-teal-700" />
                            إلغاء الغياب
                          </button>
                          <button
                            type="button"
                            aria-label={`حذف ${st.fullName}`}
                            onClick={() => onRemoveStudent(st.id)}
                            className="rounded p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
