import {
  CollectorFilter, MessageReaction, TextBasedChannelFields, User as DiscordUser,
} from 'discord.js';

async function createMenu<T>(
  list : T[],
  owner : DiscordUser,
  channel : TextBasedChannelFields,
  title : string,
  mapper : (item : T) => string | Promise<string>,
  selectCallback : (selected : T) => boolean | Promise<boolean> | void | Promise<void>,
) {
  const emotes = [
    '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣',
  ];
  const pageLeft = '◀️';
  const pageRight = '▶️';

  let page = 0;

  const generateText = async () => {
    let text = title;

    const strings = await Promise.all(list.map(mapper));

    for (let i = 0; i < emotes.length; i += 1) {
      const item = strings[i + page * emotes.length];
      if (item) text += `\n${emotes[i]} \`${item}\``;
    }

    const pageText = `\n\n> \`${page + 1}/${Math.floor(list.length / emotes.length) + 1}\``;

    return text + pageText;
  };

  const message = await channel.send(await generateText());
  if (list.length > emotes.length) {
    message.react(pageLeft);
    message.react(pageRight);
  }
  list.forEach((q, i) => { if (i <= 4) message.react(emotes[i]); });

  // eslint-disable-next-line max-len
  const filter : CollectorFilter = (r : MessageReaction, u : DiscordUser) => (emotes.some((e) => e === r.emoji.name) || r.emoji.name === pageLeft || r.emoji.name === pageRight) && u.id === owner.id;
  const collector = message.createReactionCollector(filter);

  const timeout = (() => {
    let to : NodeJS.Timeout;
    return (action : 'reset' | 'stop') => {
      if (to) clearTimeout(to);
      if (action === 'reset') {
        to = setTimeout(() => {
          collector.stop();
          message.delete().catch(console.error);
        }, 1000 * 30);
      }
    };
  })();

  timeout('reset');

  collector.on('collect', async (r, u) => {
    const i = emotes.findIndex((e) => e === r.emoji.name);
    const item = list[i + page * emotes.length];

    r.users.remove(u).catch();

    if (item && i !== -1) {
      const destroyMessage = await selectCallback(item);

      if (destroyMessage || destroyMessage === undefined) {
        message.delete();
        collector.stop();
        timeout('stop');
      } else timeout('reset');
    }

    if (r.emoji.name === pageLeft || r.emoji.name === pageRight) {
      if (r.emoji.name === pageLeft && page > 0) page -= 1;
      if (r.emoji.name === pageRight && page < Math.floor(list.length / emotes.length)) {
        page += 1;
      }

      message.edit(await generateText());

      timeout('reset');
    }
  });
}

export default createMenu;
