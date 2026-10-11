import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

/** Parses and REPLACES req.body / req.query / req.params with the validated (and coerced) values. Use .strict() on body schemas. */
export const validate =
  (s: { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }): RequestHandler =>
  (req, _res, next) => {
    try {
      if (s.body) req.body = s.body.parse(req.body);
      if (s.query) req.query = s.query.parse(req.query) as typeof req.query;
      if (s.params) req.params = s.params.parse(req.params) as typeof req.params;
      next();
    } catch (e) {
      next(e);
    }
  };
