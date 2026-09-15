import createApp from './app';
import env from './config/env';
import { logger } from './utils/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`==================================================`);
  logger.info(`  Brownie Points Enterprise Backend API Running   `);
  logger.info(`  Mode: ${env.NODE_ENV}                           `);
  logger.info(`  Port: ${env.PORT}                               `);
  logger.info(`  Health: http://localhost:${env.PORT}/api/v1/health`);
  logger.info(`  Swagger Docs: http://localhost:${env.PORT}/api/docs`);
  logger.info(`==================================================`);
});

const handleShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default server;
