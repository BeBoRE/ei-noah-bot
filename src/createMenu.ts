import {
  CommandInteraction,
  Message,
  ReactionCollectorOptions, User as DiscordUser,
} from 'discord.js';

export type ButtonReturn = boolean | Promise<boolean>
| void | Promise<void>
| string | Promise<string>;

export type ExtraButton = [string, () => ButtonReturn];

async function createMenu<T>(
  list : T[],
  owner : DiscordUser,
  msg : Message | CommandInteraction,
  title : string,
  mapper : (item : T) => string | Promise<string>,
  selectCallback : (selected : T) => ButtonReturn,
  ...extraButtons : ExtraButton[]
) {
  const emotes = [
    '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣',
  ];
  const pageLeft = '◀️';
  const pageRight = '▶️';

  let page = 0;
  let pages = Math.floor(list.length / emotes.length);
  if (list.length % emotes.length) pages += 1;

  const generateText = async () => {
    let text = title;

    const strings = await Promise.all(list.map(mapper));

    for (let i = 0; i < emotes.length; i += 1) {
      const item = strings[i + page * emotes.length];
      if (item) text += `\n${emotes[i]} \`${item}\``;
    }

    const pageText = `\n\n> \`${page + 1}/${pages}\``;

    return text + pageText;
  };

  let message : Message;
  if (msg instanceof Message) {
    message = await msg.reply(await generateText());
  } else {
    const followup = await msg.followUp(await generateText());
    if (!(followup instanceof Message)) throw new TypeError('Follow up is not of type message');
    message = followup;
  }

  if (list.length > emotes.length) {
    await Promise.all([message.react(pageLeft), message.react(pageRight)]).catch(() => { });
  }

  const awaitList : Promise<unknown>[] = [];

  list.forEach((q, i) => { if (i < emotes.length) awaitList.push(message.react(emotes[i])); });
  extraButtons.forEach((b) => awaitList.push(message.react(b[0])));

  Promise.all(message.reactions.cache.map((r) => {
    if (r.users.cache.has(owner.id)) return r.users.remove(owner);
    return null;
  })).catch(() => { });

  // eslint-disable-next-line max-len
  const filter : ReactionCollectorOptions = { filter: (r, u) => (emotes.some((e) => e === r.emoji.name) || extraButtons.some((b) => b[0] === r.emoji.name) || r.emoji.name === pageLeft || r.emoji.name === pageRight) && u.id === owner.id };
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

    r.users.remove(u).catch(() => {});

    if (item && i !== -1) {
      const destroyMessage = await selectCallback(item);

      if (destroyMessage || destroyMessage === undefined) {
        await Promise.all(awaitList).catch(() => { });
        message.delete().catch(() => {});
        collector.stop();
        timeout('stop');
      } else {
        timeout('reset');
        message.edit(await generateText()).catch(() => {});
      }
    }

    const extraButton = extraButtons.find((eb) => eb[0] === r.emoji.name);

    if (extraButton) {
      const destroyMessage = await extraButton[1]();

      if (destroyMessage || destroyMessage === undefined) {
        await Promise.all(awaitList).catch(() => {});
        message.delete().catch(() => {});
        collector.stop();
        timeout('stop');
      } else {
        timeout('reset');
        message.edit(await generateText()).catch(() => {});
      }
    }

    if (r.emoji.name === pageLeft || r.emoji.name === pageRight) {
      if (r.emoji.name === pageLeft && page > 0) page -= 1;
      if (r.emoji.name === pageRight && page < pages - 1) {
        page += 1;
      }

      message.edit(await generateText()).catch(() => {});

      timeout('reset');
    }
  });
}

export default createMenu;
