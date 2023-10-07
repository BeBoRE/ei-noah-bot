# Typesafe Redis Pub/Sub channels

[![npm version](https://badge.fury.io/js/zod-redis-pubsub.svg)](https://badge.fury.io/js/zod-redis-pubsub)

Allows for the creation of typesafe Redis Pub/Sub channels. This is does this by using the [Zod](https://zod.dev/) library to validate the data being sent to and being received from Redis. Data is (de)serialized using [SuperJSON](https://www.npmjs.com/package/superjson) allowing us to easily send types like `Date` and `BigInt` over the wire.

## Installation

```bash
pnpm i zod-redis-pussub
```

## Usage

### Initializing the channel creator

```ts
import { channelCreator } from 'zod-redis-pubsub';

const redisUrl = process.env.REDIS_URL;

// In order to both publish and subscribe to channels, we need to create two
// Redis clients, because the client is put into subscribe mode when we subscribe
// to a channel. This means that we can't publish to the same client that we're
// subscribing with.
const publisher = redisUrl ? new Redis(redisUrl) : new Redis();
const subscriber = publisher.duplicate();

const createChannel = channelCreator({ publisher, subscriber });
```

### Creating a channel

```ts
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const channel = createChannel('my-channel', userSchema);
```

### Using the channel

A channel contains two methods: `publish` and `subscribe`. `publish` is used to send data to the channel, `subscribe` is used to receive data from the channel.

```ts
// Publishing to the channel
channel.publish({
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
});

// Subscribing to the channel
channel.subscribe({
  onData: (data) => {
    console.log(data); // => { id: '1', name: 'John Doe' }
  },
  onSubscribe: () => {
    console.log('Subscribed to channel');
  },
});
```

### Channels with parameters

If you want to listen to a channel from multiple sources, you can do this by using parameters. You can do this by passing a channel name callback that can receive parameters and then returns the channel name.

```ts
const channel = createChannel((userId: string) => `user:${userId}`, userSchema);
```

You can then subscribe to the channel by passing the parameters to the `subscribe` method.

```ts
channel.subscribe(
  {
    onData: (data) => {
      console.log(data); // => { id: '1', name: 'John Doe' }
    },
    onSubscribe: () => {
      console.log('Subscribed to channel');
    },
  },
  '1',
); // => Subscribes to the channel "user:1"'
```

Channels can have multiple parameters.

```ts
const channel = createChannel(
  (userId, topic) => `user:${userId}:post:${topic}`,
  topicSchema,
);

channel.publish(
  {
    postId: 'hello-world',
    userId: '1',
    title: 'My first post',
    content: 'Hello world!',
    postedAt: new Date(),
  },
  '1',
  'hello-world',
); // => Publishes to the channel "user:1:post:hello-world"
```

### Handling errors

To learn more about `ZodError`, see the [Zod documentation](https://zod.dev/?id=error-handling).

#### Publishing

Publish validates all data being sent. Subscribe validates all data being received. Publish returns a promise that resolves when the data has been sent, if parsing fails the promise will reject, throwing a `ZodError`.

```ts
import { ZodError } from 'zod';

channel
  .publish({
    id: '1',
    name: 'John Doe',
    email: 'this is not an email', // => Throws a ZodError
  })
  .catch((err) => {
    // Error could also come from Redis
    if (err instanceof ZodError) {
      console.log(err.errors);
    }
  });
```

#### Subscribing

To catch errors when subscribing, you can pass two additional callbacks to the subscribe options: `onParsingError` and `onSubscriptionError`. `onParsingError` is called when parsing fails receiving a `ZodError`, `onSubscriptionError` is called when the subscription fails.

```ts
channel.subscribe({
  onData: (data) => {
    console.log(data);
  },
  onSubscribe: () => {
    console.log('Subscribed to channel');
  },
  onParsingError: (err) => {
    console.log(err.errors);
  },
  onSubscriptionError: (err) => {
    // Called when subscription fails
    console.log(err);
  },
});
```

### Unsubscribing

The `subscribe` method returns a function that can be used to unsubscribe from the channel.

```ts
const unsubscribe = channel.subscribe({
  onData: (data) => {
    console.log(data);
  },
  onSubscribe: () => {
    console.log('Subscribed to channel');
  },
});

// Unsubscribe after 5 seconds
setTimeout(() => {
  unsubscribe();
}, 5 * 1000);
```
