import { format, formatDistanceToNowStrict } from 'date-fns';

export const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export const formatTime = (iso: string) => {
  try {
    return format(new Date(iso), 'h:mm a');
  } catch {
    return '--:--';
  }
};

export const timeAgo = (iso: string) => {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return 'just now';
  }
};

export const formatMMSS = (sec: number) => {
  const safeSec = Math.max(sec, 0);
  const m = Math.floor(safeSec / 60);
  const s = Math.floor(safeSec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};
