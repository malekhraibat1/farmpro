/**
 * حدّ لمحاولات الدخول الخاطئة (PIN / كلمات مرور الصيدليات).
 * بعد 5 محاولات خاطئة يُقفل الإدخال 30 ثانية، ويتضاعف زمن القفل مع كل دفعة فشل جديدة (حتى 15 دقيقة).
 * ملاحظة: هذا حاجز على مستوى الواجهة فقط، الحماية الكاملة تتطلب مصادقة على الخادم (Supabase Auth).
 */
const MAX_FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 15 * 60_000;

interface ThrottleState {
  failures: number;
  lockedUntil: number;
}

const memory: Record<string, ThrottleState> = {};

function storageKey(key: string) {
  return `pharma_throttle_v1_${key}`;
}

function load(key: string): ThrottleState {
  if (memory[key]) return memory[key];
  let state: ThrottleState = { failures: 0, lockedUntil: 0 };
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey(key)) : null;
    if (raw) {
      const p = JSON.parse(raw);
      state = { failures: Number(p.failures) || 0, lockedUntil: Number(p.lockedUntil) || 0 };
    }
  } catch {}
  memory[key] = state;
  return state;
}

function save(key: string, state: ThrottleState) {
  memory[key] = state;
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(state));
  } catch {}
}

/** كم ثانية متبقية على انتهاء القفل (0 = غير مقفول) */
export function lockSecondsRemaining(key: string, now: number = Date.now()): number {
  const s = load(key);
  return s.lockedUntil > now ? Math.ceil((s.lockedUntil - now) / 1000) : 0;
}

export function recordFailure(key: string, now: number = Date.now()): number {
  const s = load(key);
  s.failures += 1;
  if (s.failures >= MAX_FREE_ATTEMPTS) {
    const rounds = s.failures - MAX_FREE_ATTEMPTS; // 0,1,2...
    const lock = Math.min(MAX_LOCK_MS, BASE_LOCK_MS * Math.pow(2, rounds));
    s.lockedUntil = now + lock;
  }
  save(key, s);
  return lockSecondsRemaining(key, now);
}

export function resetThrottle(key: string) {
  save(key, { failures: 0, lockedUntil: 0 });
}

export function formatLock(seconds: number): string {
  if (seconds >= 60) return `${Math.ceil(seconds / 60)} دقيقة`;
  return `${seconds} ثانية`;
}
