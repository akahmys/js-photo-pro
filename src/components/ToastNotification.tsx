import type React from 'react';
import { Ic } from './Icons';

interface ToastNotificationProps {
  toast: { message: string; type: 'success' | 'error' } | null;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast }) => {
  if (!toast) return null;

  const isErr = toast.type === 'error';

  return (
    <div
      className={`fixed bottom-6 right-6 z-[3000] no-print flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl text-white text-xs font-bold border transition-all duration-300 animate-slideIn ${isErr ? 'bg-gradient-to-r from-red-600 to-rose-600 border-red-500/30' : 'bg-gradient-to-r from-slate-900 to-slate-850 border-slate-800'}`}
    >
      <div className={`p-1 rounded-lg ${isErr ? 'bg-white/10' : 'bg-blue-500/10'}`}>
        <Ic
          k={isErr ? 'alertCircle' : 'check'}
          size={16}
          cls={isErr ? 'text-white' : 'text-blue-400'}
        />
      </div>
      <span>{toast.message}</span>
    </div>
  );
};
