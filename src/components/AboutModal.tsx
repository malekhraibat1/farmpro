import React from 'react';
import { Phone, Mail, MessageSquare, Award, CheckCircle2, ShieldCheck, Laptop, Smartphone, X } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-right">
        {/* Header gradient banner */}
        <div className="bg-gradient-to-l from-cyan-600 via-blue-600 to-indigo-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Award className="w-8 h-8 text-cyan-200" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-semibold tracking-wider text-cyan-100 mb-1">
                المطور والمهندس المعتمد
              </span>
              <h2 className="text-2xl font-black">المهندس مالك حريبات</h2>
              <p className="text-sm text-cyan-100 font-medium">مهندس أنظمة ومطور برمجيات طبية ومحاسبية</p>
            </div>
          </div>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <p className="text-sm text-slate-600 leading-relaxed">
              تم تصميم وتطوير هذا النظام المحاسبي المتكامل خصيصاً للصيدليات لتوفير أعلى درجات الدقة المحاسبية، إدارة تعاملات الشركات والصيدليات الزميلة، التزامن السلس، والتوافق الكامل مع شاشات الكمبيوتر وهواتف الآيفون.
            </p>
          </div>

          {/* Quick contact buttons */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">قنوات التواصل المباشر</h3>
            
            {/* Phone */}
            <a
              href="tel:0594345464"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 text-emerald-900 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-emerald-700 font-medium">اتصال هاتفي مباشر</div>
                  <div className="text-base font-bold font-mono tracking-wider dir-ltr text-right">0594345464</div>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold">اتصال</span>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/970594345464"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200/70 text-teal-900 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-teal-700 font-medium">محادثة واتساب سريعة</div>
                  <div className="text-base font-bold font-mono tracking-wider dir-ltr text-right">0594345464</div>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-lg bg-teal-600 text-white font-semibold">مراسلة</span>
            </a>

            {/* Email */}
            <a
              href="mailto:hraibat.malek@gmail.com"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200/70 text-blue-900 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-blue-700 font-medium">البريد الإلكتروني المهني</div>
                  <div className="text-sm font-bold font-mono text-slate-800">hraibat.malek@gmail.com</div>
                </div>
              </div>
              <span className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold">إرسال</span>
            </a>
          </div>

          {/* System features badge */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>نظام حماية وتشفير متكامل</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>قيد محاسبي مزدوج دقيق</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-600" />
              <span>متوافق كلياً مع آيفون iOS</span>
            </div>
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-cyan-600" />
              <span>متوافق مع أجهزة الكمبيوتر</span>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>الإصدار 2.5 (Pro Production)</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-all shadow-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
