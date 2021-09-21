import {
  CollectorOptions,
  CommandInteraction,
  Message,
  MessageActionRow,
  MessageButton,
  MessageComponentInteraction,
  User as DiscordUser,
} from 'discord.js';

export type ButtonReturn = boolean | Promise<boolean>
| void | Promise<void>
| string | Promise<string>;

export type ExtraButton = [MessageButton, () => ButtonReturn];

async function createMenu<T>(
  {
    list,
    owner,
    msg,
    title,
    mapper,
    selectCallback,
    extraButtons = [],
  } : {
    list : T[],
    owner : DiscordUser,
    msg : Message | CommandInteraction,
    title : string,
    mapper : (item : T) => string | Promise<string>,
    selectCallback : (selected : T) => ButtonReturn,
    extraButtons ?: ExtraButton[]
  },
) {
  const navigationButtons : MessageButton[] = [
    new MessageButton({
      customId: '1',
      label: '1',
      style: 'PRIMARY',
      disabled: true,
    }), new MessageButton({
      customId: '2',
      label: '2',
      style: 'PRIMARY',
      disabled: true,
    }), new MessageButton({
      customId: '3',
      label: '3',
      style: 'PRIMARY',
      disabled: true,
    }), new MessageButton({
      customId: '4',
      label: '4',
      style: 'PRIMARY',
      disabled: true,
    }), new MessageButton({
      customId: '5',
      label: '5',
      style: 'PRIMARY',
      disabled: true,
    }),
  ];

  const pageLeft = new MessageButton({
    customId: 'left',
    label: '◀️',
    style: 'SECONDARY',
  });
  const pageRight = new MessageButton({
    customId: 'right',
    label: '▶️',
    style: 'SECONDARY',
  });

  let page = 0;
  let pages = Math.floor(list.length / navigationButtons.length);
  if (list.length % navigationButtons.length) pages += 1;

  const generateText = async () => {
    let text = title;

    const strings = await Promise.all(list.map(mapper));

    for (let i = 0; i < navigationButtons.length; i += 1) {
      const item = strings[i + page * navigationButtons.length];
      if (item) text += `\n${navigationButtons[i].label} \`${item}\``;
    }

    if (pages - 1) text += `\n\n> \`${page + 1}/${pages}\``;

    return text;
  };

  const generateButtons = () => {
    const listButtons = new MessageActionRow();

    list.forEach((q, i) => {
      if (i < navigationButtons.length) {
        const item = list[i + page * navigationButtons.length];
        navigationButtons[i].setDisabled(!item);
        listButtons.addComponents(navigationButtons[i]);
      }
    });

    const additionalButtons : MessageButton[] = [];

    if (list.length > navigationButtons.length) {
      pageLeft.setDisabled(page === 0);
      pageRight.setDisabled(page === pages - 1);

      additionalButtons.push(pageLeft, pageRight);
    }

    extraButtons.forEach((button) => {
      additionalButtons.push(button[0]);
    });

    const rows : MessageActionRow[] = [listButtons];
    for (let i = 0; i < Math.ceil(additionalButtons.length / 5); i += 1) {
      const row = new MessageActionRow();
      for (let j = 0; j < 5; j += 1) {
        const button = additionalButtons[i * 5 + j];
        if (button) row.addComponents(button);
      }
      rows.push(row);
    }

    return rows;
  };

  const components = generateButtons();

  let message : Message;
  if (msg instanceof Message) {
    message = await msg.reply({ content: await generateText(), components });
  } else {
    const followup = await msg.followUp({ content: await generateText(), components });
    if (!(followup instanceof Message)) throw new TypeError('Follow up is not of type message');
    message = followup;
  }

  // eslint-disable-next-line max-len
  const filter : CollectorOptions<[MessageComponentInteraction]> = { filter: (i) => (navigationButtons.some((e) => e.customId === i.customId) || extraButtons.some((b) => b[0].customId === i.customId) || i.customId === pageLeft.customId || i.customId === pageRight.customId) && i.user.id === owner.id };
  const collector = message.createMessageComponentCollector(filter);

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

  collector.on('collect', async (interaction) => {
    const i = navigationButtons.findIndex((e) => interaction.customId === e.customId);
    const item = list[i + page * navigationButtons.length];

    if (item && i !== -1) {
      const destroyMessage = await selectCallback(item);

      if (destroyMessage || destroyMessage === undefined) {
        if (typeof destroyMessage === 'string') {
          interaction.update({ content: destroyMessage, components: [] }).catch((err) => console.log(err));
        } else {
          message.delete().catch(() => {});
        }

        collector.stop();
        timeout('stop');
      } else {
        timeout('reset');
        interaction.update({ content: await generateText(), components: generateButtons() }).catch(() => {});
      }
    }

    const extraButton = extraButtons.find((eb) => eb[0].customId === interaction.customId);

    if (extraButton) {
      const destroyMessage = await extraButton[1]();

      if (destroyMessage || destroyMessage === undefined) {
        if (typeof destroyMessage === 'string') {
          interaction.update({ content: destroyMessage, components: [] }).catch((err) => console.log(err));
        } else {
          message.delete().catch(() => {});
        }

        collector.stop();
        timeout('stop');
      } else {
        timeout('reset');
        interaction.update({ content: await generateText(), components: generateButtons() }).catch(() => {});
      }
    }

    if (interaction.customId === pageLeft.customId || interaction.customId === pageRight.customId) {
      if (interaction.customId === pageLeft.customId && page > 0) page -= 1;
      if (interaction.customId === pageRight.customId && page < pages - 1) {
        page += 1;
      }

      interaction.update({ content: await generateText(), components: generateButtons() }).catch(() => {});

      timeout('reset');
    }
  });
}

export default createMenu;
