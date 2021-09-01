import {
  BaseGuildTextChannel,
  MessageEmbed, User,
} from 'discord.js';
import Chain from 'markov-chains';
import Router, { HandlerType } from '../router/Router';

const router = new Router('Simuleer je vrienden');

const userChain = new Map<string, Chain<string> | null>();

router.use('user', async ({ flags, params, msg }) => {
  const [user] = flags.get('persoon') || params;

  if (!(user instanceof User)) return 'Geef iemand om te simuleren';

  let chain : Chain<string> | undefined | null = userChain.get(user.id);

  if (chain === null) return 'Ik ben toch bezig retard';

  if (!chain) {
    userChain.set(user.id, null);
    const spliced : string[] = new Array<string>().concat(...(await Promise.all(msg.guild.channels.cache
      .filter((channel) : channel is BaseGuildTextChannel => {
        const permissions = msg.client.user && channel.permissionsFor(msg.client.user);
        return !!(channel.isText() && permissions?.has('READ_MESSAGE_HISTORY') && permissions.has('VIEW_CHANNEL'));
      })
      .map(async (channel) => {
        const messages : string[] = [];

        let lastMessage : string | undefined = channel.lastMessageId ?? undefined;
        if (lastMessage) {
          let iterations = 0;
          while (lastMessage && iterations < 20 && messages.length < 150) {
            iterations += 1;
            // console.log(`---=== Fetching in ${channel.name} ${channel.parent ? `(${channel.parent.name})` : ''} ===---`);
            // eslint-disable-next-line no-await-in-loop
            const fetchedMessages = await channel.messages.fetch({ limit: 100, before: lastMessage })
            // eslint-disable-next-line no-loop-func
              .then((msgs) => {
                lastMessage = msgs.last()?.id !== lastMessage ? msgs.last()?.id : undefined;
                return msgs;
              })
            // eslint-disable-next-line no-loop-func
              .catch((err) => console.log(err));

            fetchedMessages?.forEach((m) => {
              if (m.content !== '' && m.author.id === user.id) {
                // console.log(m.content);
                messages.push(m.content);
              }
            });
          }
        }

        // console.log(`---=== Completed ${channel.name} ${channel.parent ? `(${channel.parent.name})` : ''} ===---`);
        return messages;
      }))));

    if (spliced.length < 50) return 'Niet genoeg berichten gevonden om iets mee te genereren';
    console.log(`${spliced.length} berichten gevonden`);

    chain = new Chain(spliced.map((m) => m.split(' ')).slice(0, spliced.length > 500 ? 500 : -1));
    userChain.set(user.id, chain);
  }

  const text = chain.walk().join(' ');

  const embed = new MessageEmbed();
  const avatarURL = user.avatarURL({ size: 128, format: 'png', dynamic: false }) || undefined;
  const color : number | undefined = msg.guild.me?.displayColor;
  embed.setAuthor(user.username, avatarURL);
  embed.setDescription(text);

  if (color) embed.setColor(color);

  return {
    embeds: [embed],
    allowedMentions: {
      roles: [],
      users: [],
      repliedUser: false,
    },
  };
}, HandlerType.GUILD, {
  description: 'Simuleer je vrienden',
  options: [{
    name: 'persoon',
    description: 'Persoon die je wil simuleren',
    type: 'USER',
    required: true,
  }],
});

export default router;
