/**
 * سجل أعطال محلي (آخر 30 عطلاً). لا يُرسَل لأي خادم: يستطيع المستخدم نسخ التقرير وإرساله لك عند حدوث مشكلة.
 */
const KEY = 'pharma_error_log_v1';
const MAX = 30;

export interface LoggedError {
  time: string;
  message: string;
  stack?: string;
  where?: string;
}

export function getErrorLog(): LoggedError[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logError(err: unknown, where?: string): void {
  try {
    const e = err as any;
    const entry: LoggedError = {
      time: new Date().toISOString(),
      message: String(e?.message || e || 'خطأ غير معروف').slice(0, 300),
      stack: e?.stack ? String(e.stack).slice(0, 800) : undefined,
      where,
    };
    const list = getErrorLog();
    list.push(entry);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {}
}

export function clearErrorLog(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}

export function formatErrorReport(appVersion: string): string {
  const list = getErrorLog();
  const header = [
    `تقرير أعطال فارما برو (الإصدار ${appVersion})`,
    `الوقت: ${new Date().toISOString()}`,
    `المتصفح: ${typeof navigator !== 'undefined' ? navigator.userAgent : '-'}`,
    `عدد الأعطال المسجّلة: ${list.length}`,
    '',
  ].join('\n');
  return (
    header +
    list
      .map((e, i) => `#${i + 1} ${e.time}${e.where ? ` [${e.where}]` : ''}\n${e.message}${e.stack ? `\n${e.stack}` : ''}`)
      .join('\n\n')
  );
}

export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', ev => logError(ev.error || ev.message, 'window.error'));
  window.addEventListener('unhandledrejection', ev => logError(ev.reason, 'promise'));
}
