import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { initStorage } from './services/storage';
import { installGlobalErrorHandlers } from './services/errorLog';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/arabic-900.css';
import '@fontsource/cairo/latin-400.css';
import '@fontsource/cairo/latin-700.css';
import './index.css';

installGlobalErrorHandlers();

async function bootstrap() {
  // تحويل أي بيانات محفوظة بالصيغ القديمة قبل أن تقرأها الواجهة (حتى لا تضيع بيانات المستخدمين)
  await initStorage();

  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );

  // تسجيل خدمة العمل دون إنترنت (في النسخة المنشورة فقط)
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registration failed:', err));
    });
  }
}

bootstrap();
