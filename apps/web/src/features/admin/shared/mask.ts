export const maskAccountRef = (ref: string): string =>
  ref.length <= 7 ? '••••' : `${ref.slice(0, 4)}••••${ref.slice(-3)}`;

export const maskBank = (last4: string): string => `••••${last4}`;