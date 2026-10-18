import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const inputCls = 'w-full rounded-lg border border-stone-300 bg-white p-3 text-base outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/20';

export function Btn({ primary, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...p}
      className={`rounded-lg px-4 py-3 font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-50 ${primary ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-stone-200 hover:bg-stone-300'} ${className}`}
    />
  );
}

export function Msg({ kind, children }: { kind: 'ok' | 'err'; children: ReactNode }) {
  return <p role="status" className={`rounded-lg p-3 text-sm ${kind === 'ok' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>{children}</p>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-stone-600">{label}</span>
      {children}
    </label>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-[#e6ebe3] bg-white p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-[#2f4a37]">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Modal({ title, children, confirmText = 'Confirm', cancelText = 'Cancel', onCancel, onConfirm }: { title: string; children: ReactNode; confirmText?: string; cancelText?: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative z-10 max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-4">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-lg px-4 py-2 text-sm" onClick={onCancel}>{cancelText}</button>
          <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

