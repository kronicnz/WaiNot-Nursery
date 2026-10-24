import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/client/api';
import { Btn, inputCls, Modal, Msg } from '../ui';

interface Grade {
  id: string;
  code: string;
  name: string;
  adjustment_pct: number;
  sort_order: number;
  active: boolean;
}

export default function GradesEditor({ focus, onFocused }: { focus?: boolean; onFocused?: () => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (focus && rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const first = rootRef.current.querySelector('input,select,button') as HTMLElement | null;
      if (first) first.focus();
      if (onFocused) onFocused();
    }
  }, [focus, onFocused]);

  const [items, setItems] = useState<Grade[]>([]);
  const [err, setErr] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ code: string; name: string; adjustment_pct: string; sort_order: string; active: boolean }>({
    code: '', name: '', adjustment_pct: '0', sort_order: '0', active: true,
  });
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newAdj, setNewAdj] = useState('0');
  const [newSort, setNewSort] = useState('0');
  const [confirm, setConfirm] = useState<{ id: string; name: string; active: boolean } | null>(null);

  const load = useCallback(() => api<Grade[]>('/api/pricing/grades').then(setItems).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const pct = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(0) + '%';

  const startEdit = (item: Grade) => {
    setEditingId(item.id);
    setEditing({ code: item.code, name: item.name, adjustment_pct: String(item.adjustment_pct), sort_order: String(item.sort_order), active: !!item.active });
  };
  const saveEdit = async (id: string) => {
    setErr('');
    try {
      await api(`/api/pricing/grades/${id}`, {
        method: 'PATCH',
        json: {
          code: editing.code.trim() || null,
          name: editing.name.trim() || null,
          adjustment_pct: Number(editing.adjustment_pct),
          sort_order: Number(editing.sort_order) || 0,
          active: editing.active,
        },
      });
      setEditingId(null);
      load();
    } catch (e) { setErr((e as Error).message); }
  };
  const create = async () => {
    setErr('');
    try {
      await api('/api/pricing/grades', {
        method: 'POST',
        json: {
          code: newCode.trim(),
          name: newName.trim(),
          adjustment_pct: Number(newAdj),
          sort_order: Number(newSort) || 0,
          active: true,
        },
      });
      setNewCode(''); setNewName(''); setNewAdj('0'); setNewSort('0');
      load();
    } catch (e) { setErr((e as Error).message); }
  };
  const toggleActive = async (id: string, currentlyActive: boolean) => {
    setErr('');
    try {
      if (currentlyActive) {
        await api(`/api/pricing/grades/${id}`, { method: 'DELETE' });
      } else {
        await api(`/api/pricing/grades/${id}`, { method: 'PATCH', json: { active: true } });
      }
      setConfirm(null);
      load();
    } catch (e) { setErr((e as Error).message); setConfirm(null); }
  };

  return (
    <section ref={rootRef} className="space-y-2">
      {confirm && (
        <Modal title={confirm.active ? 'Deactivate grade' : 'Reactivate grade'} onCancel={() => setConfirm(null)} onConfirm={() => toggleActive(confirm.id, confirm.active)} confirmText={confirm.active ? 'Deactivate' : 'Reactivate'}>
          <p className="text-sm">Are you sure you want to {confirm.active ? 'deactivate' : 'reactivate'} the grade <strong>{confirm.name}</strong>?</p>
          <p className="mt-2 text-xs text-stone-500">Grade multipliers apply to every price book row for that grade.</p>
        </Modal>
      )}
      <h3 className="font-semibold">Quality grades</h3>
      <p className="text-sm text-stone-600">Multipliers applied to the base price (Standard 0%, Premium +30%, Economy -20%).</p>
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded bg-white p-2">
          {editingId === item.id ? (
            <div className="flex items-center gap-2 w-full min-w-0">
              <input className={inputCls} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="Code" maxLength={40} />
              <input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" maxLength={80} />
              <input className={`w-24 ${inputCls}`} value={editing.adjustment_pct} onChange={(e) => setEditing({ ...editing, adjustment_pct: e.target.value })} placeholder="%" />
              <input className={`w-20 ${inputCls}`} value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} placeholder="Sort" />
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
              <div className="ml-auto flex gap-2">
                <button className="underline" onClick={() => saveEdit(item.id)}>Save</button>
                <button className="underline" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <span className="min-w-0 break-words">{item.name} <span className="text-stone-500">· {item.code} · {pct(item.adjustment_pct)}{!item.active ? ' · inactive' : ''}</span></span>
              <div className="flex gap-2">
                <button className="underline" onClick={() => startEdit(item)}>Edit</button>
                <button className="underline text-red-700" onClick={() => { if (item.active) setConfirm({ id: item.id, name: item.name, active: !!item.active }); else toggleActive(item.id, !!item.active); }}>{item.active ? 'Deactivate' : 'Reactivate'}</button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={inputCls} placeholder="Code (e.g. premium)" value={newCode} onChange={(e) => setNewCode(e.target.value)} maxLength={40} />
        <input className={inputCls} placeholder="Name (e.g. Premium)" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />
        <input className={`w-24 ${inputCls}`} placeholder="+30" value={newAdj} onChange={(e) => setNewAdj(e.target.value)} />
        <input className={`w-20 ${inputCls}`} placeholder="Sort" value={newSort} onChange={(e) => setNewSort(e.target.value)} />
        <Btn primary disabled={!newCode.trim() || !newName.trim()} onClick={create}>Add</Btn>
      </div>

      {err && <Msg kind="err">{err}</Msg>}
    </section>
  );
}
