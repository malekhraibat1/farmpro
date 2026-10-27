import React, { useEffect, useState } from 'react';
import { Database, ShieldAlert, ScrollText, Bug, Copy, Trash2 } from 'lucide-react';
import { AppStorage, getStorageInfo } from '../services/storage';
import { clearErrorLog, formatErrorReport, getErrorLog } from '../services/errorLog';
import { AuditEntry } from '../types';

const APP_VERSION = '1.1.0';

export const SystemInfoPanel: React.FC = () => {
  const [info, setInfo] = useState<{ engine: string; usageBytes: number; quotaBytes: number } | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [errCount, setErrCount] = useState(getErrorLog().length);
  const [msg, setMsg] = useState('');
  const lastBackup = AppStorage.getLastBackupAt();

  useEffect(() => {
    getStorageInfo().then(setInfo);
    setAudit([...AppStorage.getAudit()].reverse().slice(0, 150));
  }, []);

  const days = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : null;
  const backupBad = days === null || days >= 7;
  const mb = (b: number) => (b / 1024 / 1024).toFixed(1);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
        <Database className="w-5 h-5 text-slate-700" />
        حالة النظام والأمان
      </h3>

      <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 ${backupBad ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-emerald-50 border-emerald-300 text-emerald-950'}`}>
        <ShieldAlert className="w-4 h-4 shrink-0" />
        {lastBackup
          ? `آخر نسخة احتياطية: ${new Date(lastBackup).toLocaleDateString('ar-EG')} (قبل ${days} يوم)${backupBad ? ' — يُنصح بنسخة احتياطية أسبوعياً.' : ''}`
          : 'لم تُؤخذ أي نسخة احتياطية من هذا الجهاز بعد. صدّر نسخة الآن من قسم النسخ الاحتياطي.'}
      </div>

      <div className="text-xs font-bold text-slate-800 grid sm:grid-cols-2 gap-2">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
          مخزن البيانات: {info ? (info.engine === 'indexeddb' ? 'IndexedDB (مساحة كبيرة)' : 'localStorage (مساحة محدودة ~5MB)') : '...'}
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
          المساحة المستخدمة: {info && info.usageBytes ? `${mb(info.usageBytes)} MB من ${mb(info.quotaBytes)} MB` : 'غير متاح'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowAudit(v => !v)} className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-black hover:bg-slate-100 flex items-center gap-1.5">
          <ScrollText className="w-4 h-4" /> سجل التدقيق ({audit.length})
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(formatErrorReport(APP_VERSION));
            setMsg('تم نسخ تقرير الأعطال، أرسله للدعم الفني.');
          }}
          className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-xs font-black hover:bg-slate-100 flex items-center gap-1.5"
        >
          <Bug className="w-4 h-4" /> نسخ تقرير الأعطال ({errCount})
          <Copy className="w-3.5 h-3.5" />
        </button>
        {errCount > 0 && (
          <button
            onClick={() => {
              clearErrorLog();
              setErrCount(0);
            }}
            className="px-3 py-2 rounded-xl text-rose-800 text-xs font-bold hover:bg-rose-50 flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" /> مسح السجل
          </button>
        )}
        <span className="text-xs text-slate-600 self-center">الإصدار {APP_VERSION}</span>
      </div>
      {msg && <div role="status" className="text-xs font-black text-emerald-800">{msg}</div>}

      {showAudit && (
        <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200">
          {audit.length === 0 ? (
            <div className="p-6 text-center text-xs font-bold text-slate-600">لا توجد عمليات مسجّلة بعد.</div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 font-black sticky top-0">
                <tr><th className="p-2">التاريخ</th><th className="p-2">المسؤول</th><th className="p-2">العملية</th><th className="p-2">التفاصيل</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audit.map(a => (
                  <tr key={a.id}>
                    <td className="p-2 font-mono whitespace-nowrap">{a.date.slice(0, 16).replace('T', ' ')}</td>
                    <td className="p-2">{a.actor}</td>
                    <td className="p-2 font-black">{a.action}</td>
                    <td className="p-2">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
