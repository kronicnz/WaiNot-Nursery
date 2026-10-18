import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const inputCls = 'w-full rounded-lg border border-stone-300 bg-white p-3 text-base';

export function Btn({ primary, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...p}
      className={`rounded-lg px-4 py-3 font-medium disabled:opacity-50 ${primary ? 'bg-green-700 text-white' : 'bg-stone-200'} ${className}`}
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
