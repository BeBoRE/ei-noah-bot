import winston from 'winston';
import DiscordTransport from 'winston-discord-transport';
import { Console } from 'winston/lib/winston/transports';

const logger = winston.createLogger({
  transports: [
    new DiscordTransport({
      webhook: 'https://discord.com/api/webhooks/952327507808505936/aNvkie5h_9GSv4K08K3kz41ZZHLi0i69tRf0Jfxy_TFWxMcJ5D7KrmUjtk16I22gFcHm',
      defaultMeta: undefined,
      level: process.env.NODE_ENV !== 'production' ? 'verbose' : 'info',
    }),

    new Console({
      level: process.env.NODE_ENV !== 'production' ? 'verbose' : 'info',
      format: winston.format.combine(
        winston.format.cli(),
      ),
    }),
  ],
});

export default logger;
