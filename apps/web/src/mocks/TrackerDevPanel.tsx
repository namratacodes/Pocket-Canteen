import { useQueryClient } from '@tanstack/react-query';
import { usePickupCodeStore } from '@/stores/pickupCodeStore';
import { SIM_ID } from './trackerDb';
import { cancelByStaff, dropSocket, paymentExpires, restartSim, staffVerified } from './trackerSimulator';

export default function TrackerDevPanel() {
  const qc = useQueryClient();
  const restart = (scenario: 'normal' | 'pending') => {
    restartSim(scenario);
    void qc.invalidateQueries({ queryKey: ['tracker'] });
  };
  const btn = 'h-9 rounded bg-slate-700 px-2 text-xs text-white hover:bg-slate-600';
  return (
    <div className="fixed bottom-3 left-3 z-[60] w-64 space-y-2 rounded-lg border border-slate-600 bg-slate-900 p-2 text-xs text-slate-100 shadow-xl">
      <p className="font-bold">Dev panel</p>
      <div className="grid grid-cols-2 gap-1">
        <button className={btn} onClick={() => { usePickupCodeStore.getState().save(SIM_ID, { code: '4721', tokenNo: 'A-14' }); restart('normal'); }}>Create mock order</button>
        <button className={btn} onClick={() => restart('pending')}>Payment pending</button>
        <button className={btn} onClick={staffVerified}>Staff verified code</button>
        <button className={btn} onClick={cancelByStaff}>Cancel by staff</button>
        <button className={btn} onClick={paymentExpires}>Payment expires</button>
        <button className={btn} onClick={() => dropSocket(20_000)}>Drop socket 20s</button>
        <button className={btn} onClick={() => usePickupCodeStore.getState().remove(SIM_ID)}>Clear local code</button>
      </div>
      <p className="text-slate-400">Timeline: 15s cooking, 30s delay notice, 60s head to counter, 75s ready.</p>
    </div>
  );
}