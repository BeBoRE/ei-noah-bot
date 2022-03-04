import {
  Interaction,
  Embed, NewsChannel, TextChannel, ThreadChannel, User, ApplicationCommandOptionType, PermissionsBitField,
} from 'discord.js';
import Chain from 'markov-chains';
import Router, { HandlerType } from '../router/Router';

const router = new Router('Simuleer je vrienden');

const userChain = new Map<string, Chain<string> | null>();

function shuffle<T>(_array : Array<T>) : Array<T> {
  const array = [..._array];
  let currentIndex = array.length; let
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

router.use('user', async ({ flags, params, msg }) => {
  const [user] = flags.get('persoon') || params;

  if (!(user instanceof User)) return 'Geef iemand om te simuleren';

  let chain : Chain<string> | undefined | null = userChain.get(user.id);

  if (chain === null) return 'Ik ben toch bezig smeerlap';

  let defer;
  if (msg instanceof Interaction) {
    if (!msg.deferred) defer = msg.deferReply();
  }

  if (!chain) {
    userChain.set(user.id, null);
    const spliced : string[] = new Array<string>().concat(...(await Promise.all(msg.guild.channels.cache
      .filter((channel) : channel is (TextChannel | ThreadChannel | NewsChannel) => {
        if (channel.isText()) {
          if (!(channel instanceof ThreadChannel) && channel.nsfw) return false;
        }

        const permissions = msg.client.user && channel.permissionsFor(msg.client.user);
        return !!(channel.isText() && permissions?.has(PermissionsBitField.Flags.ReadMessageHistory) && permissions.has(PermissionsBitField.Flags.ViewChannel));
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

    let maxSize = 1000;
    while (!chain && maxSize > 0) {
      try {
        chain = new Chain(shuffle(shuffle(shuffle(spliced))).map((m) => m.split(' ')).slice(0, spliced.length > maxSize ? maxSize : -1));
        userChain.set(user.id, chain);
      } catch (error) {
        maxSize -= 100;
      }
    }
  }

  await defer;
  if (!chain) return 'Er kon geen model voor dit persoon gemaakt worden';

  const fromState = flags.get('finish')?.map((element) => element.toString());
  const generated = chain.walk(fromState);

  if (!generated.length) return 'Ik kon hier niks mee';

  const embed = new Embed();
  const avatarURL = user.displayAvatarURL({ size: 64 });
  const color : number | undefined = msg.guild.me?.displayColor;
  embed.setAuthor({ name: user.username, iconURL: avatarURL });
  embed.setDescription([...fromState ?? [], ...generated].join(' '));

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
    type: ApplicationCommandOptionType.User,
    required: true,
  }, {
    name: 'finish',
    description: 'Zin die afgemaakt moet worden',
    type: ApplicationCommandOptionType.String,
  }],
});

export default router;
