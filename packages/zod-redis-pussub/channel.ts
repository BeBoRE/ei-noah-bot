import { Redis } from 'ioredis';
import superjson from 'superjson';
import { z, ZodType } from 'zod';

type ChannelNamer = (...params: string[]) => string;

interface SubscribeOptions<T extends ZodType<unknown>> {
  onData: (data: z.output<T>) => void;
  onSubscription?: (channelName: string) => void;
  onUnsubscription?: (channelName: string) => void;
  onParsingError?: (err: z.ZodError<T>) => void;
  onDeserializationError?: (err: Error) => void;
  onSubscribeError?: (err: Error) => void;
  onUnsubscribeError?: (err: Error) => void;
}

type WithSubscriber = {
  subscriber: Redis;
};

type WithPublisher = {
  publisher: Redis;
};

type ChannelCreatorOptions =
  | WithSubscriber
  | WithPublisher
  | (WithSubscriber & WithPublisher);

type Publisher<T extends ZodType<unknown>, CN extends ChannelNamer | string> = (
  data: z.input<T>,
  ...params: CN extends ChannelNamer ? Parameters<CN> : []
) => Promise<number>;

type Subscriber<
  T extends ZodType<unknown>,
  CN extends ChannelNamer | string,
> = (
  options: SubscribeOptions<T>,
  ...params: CN extends ChannelNamer ? Parameters<CN> : []
) => () => void;

const channelCreator = <CCO extends ChannelCreatorOptions>(options: CCO) => {
  const createChannel = <
    T extends ZodType<unknown>,
    CN extends ChannelNamer | string,
  >(
    channelNamer: CN,
    schema?: T,
  ): CCO extends WithPublisher
    ? CCO extends WithSubscriber
      ? {
          publish: Publisher<T, CN>;
          subscribe: Subscriber<T, CN>;
        }
      : {
          publish: Publisher<T, CN>;
        }
    : {
        subscribe: CCO extends WithSubscriber ? Subscriber<T, CN> : never;
      } => {
    const publish: Publisher<T, CN> | undefined =
      'publisher' in options
        ? async (input, ...params) => {
            if (!options.publisher) {
              throw new Error('publisher not provided');
            }

            schema?.parse(input);

            const channelName =
              typeof channelNamer === 'string'
                ? channelNamer
                : channelNamer(...params);

            return options.publisher.publish(
              channelName,
              superjson.stringify(input),
            );
          }
        : undefined;

    const subscribe: Subscriber<T, CN> | undefined =
      'subscriber' in options
        ? (
            {
              onData,
              onParsingError,
              onSubscribeError,
              onSubscription,
              onDeserializationError,
              onUnsubscription,
              onUnsubscribeError,
            },
            ...params
          ) => {
            if (!options.subscriber) {
              throw new Error('subscriber not provided');
            }

            const channelName =
              typeof channelNamer === 'string'
                ? channelNamer
                : channelNamer(...params);

            const handler = (msgChannel: string, msg: string) => {
              if (channelName === msgChannel) {
                let parsed;

                try {
                  parsed = superjson.parse(msg);
                } catch (err) {
                  if (!(err instanceof Error)) {
                    return;
                  }

                  if (!onDeserializationError) {
                    return;
                  }

                  onDeserializationError?.(err);
                  return;
                }

                if (!schema) {
                  onData(parsed);
                  return;
                }

                const data = schema.safeParse(parsed);

                if (!data.success) {
                  if (!onParsingError) {
                    return;
                  }

                  // TODO: figure out how to type this
                  onParsingError(data.error as z.ZodError<T>);
                  return;
                }

                onData(data.data);
              }
            };

            options.subscriber.addListener('message', handler);

            options.subscriber
              .subscribe(channelName)
              .then(() => {
                onSubscription?.(channelName);
              })
              .catch((err) => {
                if (!onSubscribeError) {
                  return;
                }

                onSubscribeError?.(err);
              });

            return () => {
              options.subscriber
                .unsubscribe(channelName)
                .catch((err) => {
                  onUnsubscribeError?.(err);
                })
                .finally(() => {
                  onUnsubscription?.(channelName);
                });
              options.subscriber.removeListener('message', handler);
            };
          }
        : undefined;

    if (!publish && !subscribe) {
      throw new Error('no publisher or subscriber provided');
    }

    if (publish && subscribe) {
      return { publish, subscribe } as never;
    }

    if (publish) {
      return { publish } as never;
    }

    return { subscribe } as never;
  };

  return createChannel;
};

export default channelCreator;
