import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { pool } from "./database/pool.js";

try {
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "DistrictAssist API is listening");
  });
  server.requestTimeout = env.REQUEST_TIMEOUT_MS;
  server.headersTimeout = env.REQUEST_TIMEOUT_MS + 5_000;
  server.keepAliveTimeout = 5_000;

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Shutdown signal received");
    const forcedExit = setTimeout(() => {
      logger.fatal("Graceful shutdown timed out");
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS).unref();
    server.close(async () => {
      try {
        await pool.end();
        clearTimeout(forcedExit);
        logger.info("Shutdown complete");
        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, "Failed to close database pool");
        process.exit(1);
      }
    });
    server.closeIdleConnections();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
} catch (error) {
  logger.fatal({ err: error }, "Failed to start server");
  process.exit(1);
}
