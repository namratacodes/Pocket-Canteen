import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: ['req.headers.authorization', '*.password', '*.code', '*.signature', '*.token'],
});
