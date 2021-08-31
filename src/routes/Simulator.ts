import { MessageEmbed, User } from 'discord.js';
import Chain from 'markov-chains';
import Router, { HandlerType } from '../router/Router';

const router = new Router('Simuleer je vrienden');

router.use('user', async ({ flags, params, msg }) => {
  const [user] = flags.get('persoon') || params;

  if (!(user instanceof User)) return 'Geef iemand om te simuleren';

  const messages : string[] = [];

  let lastMessage : string | undefined = msg.channel.lastMessageId ?? undefined;
  let iterations = 0;
  if (lastMessage) {
    while (messages.length < 100 && lastMessage && iterations < 25) {
      console.log(`------====== ${messages.length} on the list (iteration ${iterations}) ========-------`);
      iterations += 1;
      // eslint-disable-next-line no-await-in-loop
      const fetchedMessages = await msg.channel.messages.fetch({ limit: 100, before: lastMessage })
        // eslint-disable-next-line no-loop-func
        .then((msgs) => {
          lastMessage = msgs.last()?.id;
          return msgs;
        })
        // eslint-disable-next-line no-loop-func
        .catch(() => undefined);

      fetchedMessages?.forEach((m) => {
        if (m.content !== '' && m.author.id === user.id) {
          console.log(m.content);
          messages.push(m.content);
        }
      });
    }
  }

  if (messages.length < 25) return 'Niet genoeg berichten gevonden om iets mee te genereren';

  const chain = new Chain(messages.map((m) => m.split(' ')));
  const text = chain.walk().join(' ');

  const embed = new MessageEmbed();
  const avatarURL = user.avatarURL({ size: 128, format: 'png', dynamic: false }) || undefined;
  const color : number | undefined = msg.guild.me?.displayColor;
  embed.setAuthor(user.username, avatarURL);
  embed.setDescription(text);

  if (color) embed.setColor(color);

  return embed;
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
