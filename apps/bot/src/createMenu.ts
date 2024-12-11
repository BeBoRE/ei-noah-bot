import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CollectorFilter,
  CommandInteraction,
  ComponentType,
  User as DiscordUser,
  InteractionUpdateOptions,
  Message,
  MessageActionRowComponentBuilder,
} from 'discord.js';
import _ from 'lodash';
import { Logger } from 'winston';

export type ButtonReturn =
  | boolean
  | Promise<boolean>
  | void
  | Promise<void>
  | string
  | Promise<string>
  | InteractionUpdateOptions
  | Promise<InteractionUpdateOptions>;

export type ExtraButton = [ButtonBuilder, () => ButtonReturn];

async function createMenu<T>({
  list,
  owner,
  msg,
  title,
  mapper,
  selectCallback,
  extraButtons = [],
  logger,
}: {
  list: T[];
  owner: DiscordUser;
  msg: Message | CommandInteraction;
  title: string;
  mapper: (item: T) => string | Promise<string>;
  selectCallback: (selected: T) => ButtonReturn;
  extraButtons?: ExtraButton[];
  logger: Logger;
}) {
  const navigationButtons: ButtonBuilder[] = [
    new ButtonBuilder({
      customId: '1',
      label: '1',
      style: ButtonStyle.Primary,
      disabled: true,
    }),
    new ButtonBuilder({
      customId: '2',
      label: '2',
      style: ButtonStyle.Primary,
      disabled: true,
    }),
    new ButtonBuilder({
      customId: '3',
      label: '3',
      style: ButtonStyle.Primary,
      disabled: true,
    }),
    new ButtonBuilder({
      customId: '4',
      label: '4',
      style: ButtonStyle.Primary,
      disabled: true,
    }),
    new ButtonBuilder({
      customId: '5',
      label: '5',
      style: ButtonStyle.Primary,
      disabled: true,
    }),
  ];

  const pageLeft = new ButtonBuilder({
    customId: 'left',
    label: '◀️',
    style: ButtonStyle.Secondary,
  });
  const pageRight = new ButtonBuilder({
    customId: 'right',
    label: '▶️',
    style: ButtonStyle.Secondary,
  });

  let page = 0;
  let pages = Math.floor(list.length / navigationButtons.length);
  if (list.length % navigationButtons.length) pages += 1;

  const generateText = async () => {
    let text = title;

    const strings = await Promise.all(list.map(mapper));

    for (let i = 0; i < navigationButtons.length; i += 1) {
      const item = strings[i + page * navigationButtons.length];
      if (item) {
        const buttonData = navigationButtons[i]?.data;

        if (buttonData) {
          const label = 'label' in buttonData ? buttonData.label || '' : 'UNKNOWN';

          text += `\n${label} \`${item}\``
        }
      };
    }

    if (pages - 1) text += `\n\n> \`${page + 1}/${pages}\``;

    return text;
  };

  const generateButtons = () => {
    const listButtons =
      new ActionRowBuilder<MessageActionRowComponentBuilder>();

    list.forEach((q, i) => {
      if (i < navigationButtons.length) {
        const item = list[i + page * navigationButtons.length];
        const button = navigationButtons[i];

        if (button) {
          button.setDisabled(!item);
          listButtons.addComponents([button]);
        }
      }
    });

    const additionalButtons: ButtonBuilder[] = [];

    if (list.length > navigationButtons.length) {
      pageLeft.setDisabled(page === 0);
      pageRight.setDisabled(page === pages - 1);

      additionalButtons.push(pageLeft, pageRight);
    }

    extraButtons.forEach((button) => {
      additionalButtons.push(button[0]);
    });

    const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [
      listButtons,
    ];
    for (let i = 0; i < Math.ceil(additionalButtons.length / 5); i += 1) {
      const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
      for (let j = 0; j < 5; j += 1) {
        const button = additionalButtons[i * 5 + j];
        if (button) row.addComponents([button]);
      }
      rows.push(row);
    }

    return rows;
  };

  const components = generateButtons();

  let message: Message;
  if (msg instanceof Message) {
    message = await msg.reply({ content: await generateText(), components });
  } else {
    await msg.deferReply();
    const followup = await msg.followUp({
      content: await generateText(),
      components,
    });

    message = followup;
  }

  // eslint-disable-next-line max-len
  const filter: CollectorFilter<[ButtonInteraction]> = (i) =>
    (navigationButtons.some(
      (e) => 'custom_id' in e.data && e.data?.custom_id === i.customId,
    ) ||
      extraButtons.some(
        (b) => 'custom_id' in b[0].data && b[0].data.custom_id === i.customId,
      ) ||
      ('custom_id' in pageLeft.data &&
        i.customId === pageLeft.data.custom_id) ||
      ('custom_id' in pageRight.data &&
        i.customId === pageRight.data.custom_id)) &&
    i.user.id === owner.id;
  const collector =
    message.createMessageComponentCollector<ComponentType.Button>({ filter });

  const timeout = (() => {
    let to: NodeJS.Timeout;
    return (action: 'reset' | 'stop') => {
      if (to) clearTimeout(to);
      if (action === 'reset') {
        to = setTimeout(() => {
          collector.stop();
          message
            .delete()
            .catch((error) => logger.info(error.description, { error }));
        }, 1000 * 30);
      }
    };
  })();

  timeout('reset');

  collector.on('collect', async (interaction) => {
    const i = navigationButtons.findIndex(
      (e) => 'custom_id' in e.data && interaction.customId === e.data.custom_id,
    );
    const item = list[i + page * navigationButtons.length];

    if (item && i !== -1) {
      const destroyMessage = await selectCallback(item);

      if (destroyMessage || destroyMessage === undefined) {
        if (typeof destroyMessage === 'string') {
          interaction
            .update({ content: destroyMessage, components: [] })
            .catch((error) => logger.error(error.description, { error }));
        } else if (typeof destroyMessage === 'object') {
          interaction
            .update({
              components: [],
              content: null,
              ...destroyMessage,
            })
            .catch((error) => logger.error(error.description, { error }));
        } else {
          message
            .delete()
            .catch((error) => logger.error(error.description, { error }));
        }

        collector.stop();
        timeout('stop');
      } else {
        timeout('reset');
        interaction
          .update({
            content: await generateText(),
            components: generateButtons(),
          })
          .catch(() => {});
      }
    }

    const extraButton = extraButtons.find(
      (eb) =>
        'custom_id' in eb[0].data &&
        eb[0].data.custom_id === interaction.customId,
    );

    if (extraButton) {
      const destroyMessage = await extraButton[1]();

      if (destroyMessage || destroyMessage === undefined) {
        if (typeof destroyMessage === 'string') {
          interaction
            .update({ content: destroyMessage, components: [] })
            .catch((error) => logger.error(error.description, { error }));
        } else if (_.isObject(destroyMessage)) {
          interaction
            .update({ components: [], content: null, ...destroyMessage })
            .catch((error) => logger.error(error.description, { error }));
        } else {
          message
            .delete()
            .catch((error) => logger.error(error.description, { error }));
        }

        collector.stop();
        timeout('stop');
      } else {
        timeout('reset');
        interaction
          .update({
            content: await generateText(),
            components: generateButtons(),
          })
          .catch(() => {});
      }
    }

    if (
      ('custom_id' in pageLeft.data &&
        interaction.customId === pageLeft.data.custom_id) ||
      ('custom_id' in pageRight.data &&
        interaction.customId === pageRight.data.custom_id)
    ) {
      if (
        'custom_id' in pageLeft.data &&
        interaction.customId === pageLeft.data.custom_id &&
        page > 0
      )
        page -= 1;
      if (
        'custom_id' in pageRight.data &&
        interaction.customId === pageRight.data.custom_id &&
        page < pages - 1
      ) {
        page += 1;
      }

      interaction
        .update({
          content: await generateText(),
          components: generateButtons(),
        })
        .catch(() => {});

      timeout('reset');
    }
  });
}

export default createMenu;
