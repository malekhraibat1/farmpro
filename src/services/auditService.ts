import { AppStorage } from './storage';
import { uid } from './saleService';

/** سجل تدقيق للعمليات الحساسة (حذف/تعديل حركات، تسويات مخزون، استيراد، استعادة نسخة...) */
export const AuditService = {
  log(action: string, detail: string, actor: string = 'غير معروف', instanceId?: string): void {
    try {
      const list = AppStorage.getAudit(instanceId);
      list.push({ id: uid('aud'), date: new Date().toISOString(), actor, action, detail });
      AppStorage.saveAudit(list, instanceId);
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  },
};
