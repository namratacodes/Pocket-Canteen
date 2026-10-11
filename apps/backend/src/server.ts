import http from 'http';
import cron from 'node-cron';
import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { loadModules } from './modules/registry';

async function main() {
  const modules = loadModules();
  const app = buildApp(modules);
  const server = http.createServer(app);

  for (const m of modules) await m.onStart?.({ server });

  const tasks = modules.flatMap((m) => m.jobs ?? []).map((job) => {
    let running = false; // never overlap a job with itself (single-instance assumption)
    return cron.schedule(job.cron, async () => {
      if (running) return;
      running = true;
      try {
        await job.run();
      } catch (err) {
        logger.error({ err, job: job.name }, 'job failed');
      } finally {
        running = false;
      }
    });
  });

  server.listen(env.PORT, () => logger.info({ port: env.PORT, modules: modules.map((m) => m.name) }, 'backend up'));

  const shutdown = async () => {
    logger.info('shutting down');
    tasks.forEach((t) => t.stop());
    for (const m of modules) await m.onStop?.();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'fatal');
  process.exit(1);
});
