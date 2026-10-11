import type http from 'http';
import type { Express, Router } from 'express';

export interface JobDef {
  name: string;
  /** node-cron expression, 6 fields allowed (seconds first), e.g. every minute: '0 * * * * *' */
  cron: string;
  run: () => Promise<void>;
}

/** Every phase exports exactly one of these as the default export of src/modules/<name>/index.ts */
export interface BackendModule {
  name: string;
  /** Called first, before any route is mounted. Register your port implementation(s) here. */
  register?(): void;
  /** Routes that need the RAW body or must live outside /api/v1 (webhooks, /health). Runs before express.json(). */
  mountRaw?(app: Express): void;
  /** Normal routes. `router` is already mounted at /api/v1 and sits behind express.json(). */
  mount?(router: Router): void;
  jobs?: JobDef[];
  /** Called once after the HTTP server object exists, before listen(). */
  onStart?(ctx: { server: http.Server }): void | Promise<void>;
  onStop?(): void | Promise<void>;
}
