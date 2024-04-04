import dotenv from 'dotenv';
import winston, { format, transports } from 'winston';
import { consoleFormat } from 'winston-console-format';
import DiscordTransport from 'winston-discord-transport';

dotenv.config();

const logger = winston.createLogger({
  format: format.combine(
    format.timestamp(),
    format.ms(),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  transports: [
    new transports.Console({
      level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      format: format.combine(
        format.colorize({ all: true }),
        format.padLevels(),
        consoleFormat({
          showMeta: true,
          metaStrip: ['service'],
          inspectOptions: {
            depth: Infinity,
            colors: true,
            maxArrayLength: Infinity,
            breakLength: 120,
            compact: Infinity,
          },
        }),
      ),
    }),
  ],
});

logger.info('Logging initialized');

if (process.env.LOGGING_WEBHOOK) {
  logger.add(
    new DiscordTransport({
      webhook: process.env.LOGGING_WEBHOOK,
      defaultMeta: undefined,
      level: process.env.NODE_ENV !== 'production' ? 'verbose' : 'info',
      format: format.errors({ stack: true }),
    }),
  );
} else {
  logger.info(
    'Log to a guild channel by adding a webhook to it and copying the webhook to the .env file as key LOGGING_WEBHOOK',
  );
}

export default logger;
