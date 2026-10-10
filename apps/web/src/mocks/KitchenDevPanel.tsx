import { useEffect, useState } from 'react';
import { MANAGER_PIN, devCodes } from './kitchenDb';
import { burstOrders, dropSocket, otherTabletMoves, studentCancels } from './kitchenSimulator';

export default function KitchenDevPanel() {
  const [open, setOpen] = useState(true);
  const [rows, setRows] = useState(devCodes());
  useEffect(() => {
    const id = setInterval(() => setRows(devCodes()), 1500);
    return () => clearInterval(id);
  }, []);
  const btn = 'h-9 rounded bg-slate-700 px-2 text-xs text-white hover:bg-slate-600';
  return (
    <div className="fixed bottom-3 left-3 z-[60] w-64 rounded-lg border border-slate-600 bg-slate-900 p-2 text-xs text-slate-100 shadow-xl">
      <button type="button" className="w-full text-left font-bold" onClick={() => setOpen((o) => !o)}>Dev panel {open ? '▾' : '▸'}</button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-1">
            <button className={btn} onClick={() => burstOrders(5)}>Burst 5 orders</button>
            <button className={btn} onClick={() => otherTabletMoves('A-12')}>Other tablet: A-12</button>
            <button className={btn} onClick={() => dropSocket(20_000)}>Drop socket 20s</button>
            <button className={btn} onClick={() => studentCancels('A-17')}>Student cancels A-17</button>
          </div>
          <p>Manager PIN: <b>{MANAGER_PIN}</b></p>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto font-mono">
            {rows.map((r) => <li key={r.token}>{r.token} · {r.status}{r.locked ? ' · locked' : ''} · code {r.code}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}