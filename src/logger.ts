import winston, { transports, format } from 'winston';
import { consoleFormat } from 'winston-console-format';
import DiscordTransport from 'winston-discord-transport';

const logger = winston.createLogger({
  format: format.combine(
    format.timestamp(),
    format.ms(),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  transports: [
    new DiscordTransport({
      webhook: 'https://discord.com/api/webhooks/952327507808505936/aNvkie5h_9GSv4K08K3kz41ZZHLi0i69tRf0Jfxy_TFWxMcJ5D7KrmUjtk16I22gFcHm',
      defaultMeta: undefined,
      level: process.env.NODE_ENV !== 'production' ? 'verbose' : 'info',
      format: format.errors({ stack: true }),
    }),

    new transports.Console({
      level: process.env.NODE_ENV !== 'production' ? 'verbose' : 'info',
      format: format.combine(
        format.colorize({ all: true }),
        format.padLevels(),
        consoleFormat({
          showMeta: true,
          metaStrip: ['timestamp', 'service'],
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

export default logger;
