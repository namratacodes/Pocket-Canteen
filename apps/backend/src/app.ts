import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { loadModules } from './modules/registry';
import type { BackendModule } from './modules/types';

/** Tests pass only the module(s) they need: buildApp([myModule]). Production uses buildApp() = all existing modules. */
export function buildApp(modules: BackendModule[] = loadModules()) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()), credentials: true }));

  for (const m of modules) m.register?.();
  for (const m of modules) m.mountRaw?.(app);

  app.use(express.json({ limit: '100kb' }));
  const api = Router();
  for (const m of modules) m.mount?.(api);
  app.use('/api/v1', api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
