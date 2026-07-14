import { Server } from 'http';
import app from './app';
import config from './config/index';
import prisma from './lib/prisma';

let server: Server;

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    server = app.listen(config.port, () => {
      console.log(`FixItNow server is running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection detected, shutting down:', error);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception detected, shutting down:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (server) server.close();
});
