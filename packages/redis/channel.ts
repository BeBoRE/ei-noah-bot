import { Redis } from 'ioredis';
import superjson from 'superjson';
import { z, ZodType } from 'zod';

type ChannelCreatorOptions = {
  publisher: Redis;
  subscriber: Redis;
};

type ChannelNamer = (...params: string[]) => string;

interface SubscribeOptions<T extends ZodType<unknown>> {
  onData: (data: z.output<T>) => void;
  onSubscription?: () => void;
  onParsingError?: (err: Error) => void;
  onSubscribeError?: (err: z.ZodError<T> | Error) => void;
}

const channelCreator = ({ publisher, subscriber }: ChannelCreatorOptions) => {
  const createChannel = <T extends ZodType<unknown>, CN extends ChannelNamer | string>(
    channelNamer: CN,
    schema?: T,
  ): {
    publish: (data: z.input<T>, ...params: CN extends ChannelNamer ? Parameters<CN> : []) => Promise<number>;
    subscribe: (
      options: SubscribeOptions<T>,
      ...params: CN extends ChannelNamer ? Parameters<CN> : []
    ) => () => void;
  } => ({
    publish: async (input, ...params) => {
      schema?.parse(input);

      const channelName = typeof channelNamer === 'string' ? channelNamer : channelNamer(...params);

      return publisher.publish(channelName, superjson.stringify(input));
    },
    subscribe: (
      { onData, onParsingError, onSubscribeError, onSubscription },
      ...params
    ) => {
      const channelName = typeof channelNamer === 'string' ? channelNamer : channelNamer(...params);

      const handler = (msgChannel: string, msg: string) => {
        if (channelName === msgChannel) {
          let parsed;

          try {
            parsed = superjson.parse(msg);
          } catch (err) {
            if (!(err instanceof Error)) {
              console.error(err);
              return;
            }

            if (!onParsingError) {
              console.warn(err);
              return;
            }

            onParsingError(err);
            return;
          }

          if (!schema) {
            onData(parsed);
            return;
          }

          const data = schema.safeParse(parsed);

          if (!data.success) {
            if (!onParsingError) {
              console.warn(data.error);
              return;
            }

            onParsingError(data.error);
            return;
          }

          onData(data.data);
        }
      };

      subscriber.addListener('message', handler);

      subscriber
        .subscribe(channelName)
        .then(() => onSubscription?.())
        .catch((err) => {
          if (!onSubscribeError) {
            console.error(err);
            return;
          }

          onSubscribeError?.(err);
        });

      return () => {
        subscriber.unsubscribe(channelName);
        subscriber.removeListener('message', handler);
      };
    },
  });

  return createChannel;
};

export default channelCreator;
