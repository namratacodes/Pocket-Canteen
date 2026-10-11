export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  ACCOUNT_DISABLED: 403,
  EMAIL_DOMAIN_NOT_ALLOWED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  ITEM_UNAVAILABLE: 409,
  CANTEEN_CLOSED: 409,
  INSUFFICIENT_BALANCE: 409,
  INVALID_TRANSITION: 409,
  ORDER_CANCELLED: 409,
  NOT_READY: 409,
  PAYMENT_AMOUNT_MISMATCH: 409,
  DUPLICATE_PERIOD: 409,
  OTP_INVALID: 400,
  OTP_EXPIRED: 400,
  PAYMENT_SIGNATURE_INVALID: 400,
  PICKUP_CODE_INVALID: 422,
  PICKUP_LOCKED: 423,
  RATE_LIMITED: 429,
  OTP_LOCKED: 429,
  TOO_MANY_PENDING_ORDERS: 429,
  INTERNAL: 500,
  GATEWAY_ERROR: 502,
  NOT_IMPLEMENTED: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message ?? code);
  }
  get status(): number {
    return ERROR_STATUS[this.code];
  }
}
