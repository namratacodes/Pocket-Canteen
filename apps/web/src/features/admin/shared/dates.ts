import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';

export const formatDate = (iso: string): string => format(parseISO(iso), 'd MMM yyyy');

export const timeAgo = (iso: string): string =>
  formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });