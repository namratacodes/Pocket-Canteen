let baseTitle: string | null = null;
let bound = false;

function bindRestore() {
  if (bound) return;
  bound = true;
  window.addEventListener('focus', () => {
    if (baseTitle !== null) { document.title = baseTitle; baseTitle = null; }
  });
}

export function playChime() {
  try { void new Audio('/sounds/chime.wav').play().catch(() => undefined); } catch { /* autoplay blocked */ }
}

interface AlertInput { kind: 'walk' | 'ready'; tokenNo: string; counterLabel?: string; orderId: string }

/** Vibrate, chime, tab title, and a system notification when the tab is hidden. */
export function runAlert({ kind, tokenNo, counterLabel, orderId }: AlertInput) {
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* unsupported */ }
  playChime();

  if (typeof document !== 'undefined' && !document.hasFocus()) {
    bindRestore();
    if (baseTitle === null) baseTitle = document.title;
    document.title = kind === 'ready' ? `🔔 ${tokenNo} Ready!` : `🚶 ${tokenNo}: head to the counter`;
  }

  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
      new Notification(kind === 'ready' ? `Your order ${tokenNo} is ready` : `Time to head over, ${tokenNo}`, {
        body: counterLabel ? `Collect at ${counterLabel}` : 'Collect at the counter',
        tag: orderId,
      });
    }
  } catch { /* ignore */ }
}

const PROMPTED = 'pc-notif-prompted-v1';
const wasPrompted = () => { try { return localStorage.getItem(PROMPTED) === '1'; } catch { return false; } };

export const canPromptNotifications = () =>
  typeof Notification !== 'undefined' && Notification.permission === 'default' && !wasPrompted();

export async function requestNotifications(): Promise<NotificationPermission | 'unsupported'> {
  try { localStorage.setItem(PROMPTED, '1'); } catch { /* ignore */ }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}
export const dismissNotificationPrompt = () => { try { localStorage.setItem(PROMPTED, '1'); } catch { /* ignore */ } };