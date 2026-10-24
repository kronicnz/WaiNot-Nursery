import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/client/api';
import { Btn, inputCls, Modal, Msg } from '../ui';

interface PotSize {
  id: string;
  code: string;
  name: string;
  diameter_mm: number | null;
  volume_l: number | null;
  sort_order: number;
  active: boolean;
}

export default function PotSizesEditor({ focus, onFocused }: { focus?: boolean; onFocused?: () => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (focus && rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const first = rootRef.current.querySelector('input,select,button') as HTMLElement | null;
      if (first) first.focus();
      if (onFocused) onFocused();
    }
  }, [focus, onFocused]);

  const [items, setItems] = useState<PotSize[]>([]);
  const [err, setErr] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ code: string; name: string; diameter_mm: string; volume_l: string; sort_order: string; active: boolean }>({
    code: '', name: '', diameter_mm: '', volume_l: '', sort_order: '0', active: true,
  });
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDiameter, setNewDiameter] = useState('');
  const [newVolume, setNewVolume] = useState('');
  const [newSort, setNewSort] = useState('0');
  const [confirm, setConfirm] = useState<{ id: string; name: string; active: boolean } | null>(null);

  const load = useCallback(() => api<PotSize[]>('/api/pricing/pot-sizes').then(setItems).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (item: PotSize) => {
    setEditingId(item.id);
    setEditing({ code: item.code, name: item.name, diameter_mm: String(item.diameter_mm ?? ''), volume_l: String(item.volume_l ?? ''), sort_order: String(item.sort_order), active: !!item.active });
  };
  const saveEdit = async (id: string) => {
    setErr('');
    try {
      await api(`/api/pricing/pot-sizes/${id}`, {
        method: 'PATCH',
        json: {
          code: editing.code.trim() || null,
          name: editing.name.trim() || null,
          diameter_mm: editing.diameter_mm === '' ? null : Number(editing.diameter_mm),
          volume_l: editing.volume_l === '' ? null : Number(editing.volume_l),
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
      await api('/api/pricing/pot-sizes', {
        method: 'POST',
        json: {
          code: newCode.trim(),
          name: newName.trim(),
          diameter_mm: newDiameter === '' ? null : Number(newDiameter),
          volume_l: newVolume === '' ? null : Number(newVolume),
          sort_order: Number(newSort) || 0,
          active: true,
        },
      });
      setNewCode(''); setNewName(''); setNewDiameter(''); setNewVolume(''); setNewSort('0');
      load();
    } catch (e) { setErr((e as Error).message); }
  };
  const toggleActive = async (id: string, currentlyActive: boolean) => {
    setErr('');
    try {
      if (currentlyActive) {
        await api(`/api/pricing/pot-sizes/${id}`, { method: 'DELETE' });
      } else {
        await api(`/api/pricing/pot-sizes/${id}`, { method: 'PATCH', json: { active: true } });
      }
      setConfirm(null);
      load();
    } catch (e) { setErr((e as Error).message); setConfirm(null); }
  };

  return (
    <section ref={rootRef} className="space-y-2">
      {confirm && (
        <Modal title={confirm.active ? 'Deactivate pot size' : 'Reactivate pot size'} onCancel={() => setConfirm(null)} onConfirm={() => toggleActive(confirm.id, confirm.active)} confirmText={confirm.active ? 'Deactivate' : 'Reactivate'}>
          <p className="text-sm">Are you sure you want to {confirm.active ? 'deactivate' : 'reactivate'} the pot size <strong>{confirm.name}</strong>?</p>
          <p className="mt-2 text-xs text-stone-500">Deactivating hides the size from the price book but preserves history.</p>
        </Modal>
      )}
      <h3 className="font-semibold">Pot sizes</h3>
      <p className="text-sm text-stone-600">Container sizes used in the price book (species × size × grade).</p>
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded bg-white p-2">
          {editingId === item.id ? (
            <div className="flex items-center gap-2 w-full min-w-0">
              <input className={inputCls} value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="Code" maxLength={40} />
              <input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" maxLength={80} />
              <input className={`w-20 ${inputCls}`} value={editing.diameter_mm} onChange={(e) => setEditing({ ...editing, diameter_mm: e.target.value })} placeholder="Ø mm" />
              <input className={`w-20 ${inputCls}`} value={editing.volume_l} onChange={(e) => setEditing({ ...editing, volume_l: e.target.value })} placeholder="L" />
              <input className={`w-20 ${inputCls}`} value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} placeholder="Sort" />
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
              <div className="ml-auto flex gap-2">
                <button className="underline" onClick={() => saveEdit(item.id)}>Save</button>
                <button className="underline" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <span className="min-w-0 break-words">{item.name} <span className="text-stone-500">· {item.code}{item.diameter_mm ? ` · Ø${item.diameter_mm}mm` : ''}{item.volume_l ? ` · ${item.volume_l}L` : ''}{!item.active ? ' · inactive' : ''}</span></span>
              <div className="flex gap-2">
                <button className="underline" onClick={() => startEdit(item)}>Edit</button>
                <button className="underline text-red-700" onClick={() => { if (item.active) setConfirm({ id: item.id, name: item.name, active: !!item.active }); else toggleActive(item.id, !!item.active); }}>{item.active ? 'Deactivate' : 'Reactivate'}</button>
              </div>
            </>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={inputCls} placeholder="Code (e.g. ellebag-60)" value={newCode} onChange={(e) => setNewCode(e.target.value)} maxLength={40} />
        <input className={inputCls} placeholder="Name (e.g. 60mm Ellebag)" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />
        <input className={`w-20 ${inputCls}`} placeholder="Ø mm" value={newDiameter} onChange={(e) => setNewDiameter(e.target.value)} />
        <input className={`w-20 ${inputCls}`} placeholder="Volume L" value={newVolume} onChange={(e) => setNewVolume(e.target.value)} />
        <input className={`w-20 ${inputCls}`} placeholder="Sort" value={newSort} onChange={(e) => setNewSort(e.target.value)} />
        <Btn primary disabled={!newCode.trim() || !newName.trim()} onClick={create}>Add</Btn>
      </div>

      {err && <Msg kind="err">{err}</Msg>}
    </section>
  );
}
