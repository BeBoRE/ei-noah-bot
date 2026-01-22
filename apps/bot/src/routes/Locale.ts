import { ApplicationCommandOptionType, PermissionsBitField } from 'discord.js';

import { DrizzleClient, eq } from '@ei/drizzle';
import { guilds, users } from '@ei/drizzle/tables/schema';

import Router, { HandlerType } from '../router/Router';

const router = new Router('Select your language');

router.use(
  'help',
  ({ i18n }) => i18n.t('locale.help', { joinArrays: '\n' }),
  HandlerType.BOTH,
  {
    description: 'Help menu',
  },
);

router.use(
  'languages',
  ({ i18n }) =>
    i18n.t('locale.availableLanguages', {
      languages: Object.keys(i18n.services.resourceStore.data)
        .sort()
        .map((l) => `***${l}***`),
    }),
  HandlerType.BOTH,
  {
    description: 'Get all available languages',
  },
);

const changeUserLanguage = async (
  drizzle: DrizzleClient,
  userId: string,
  language: string | null,
) =>
  drizzle
    .update(users)
    .set({
      language,
    })
    .where(eq(users.id, userId));

router.use(
  'user',
  async ({ msg, i18n, user, params, flags, getGuild, drizzle }) => {
    const [language] = flags.get('language') || params;
    const availableLanguages = Object.keys(
      i18n.services.resourceStore.data,
    ).sort();

    const guild = msg.guild && (await getGuild(msg.guild));

    if (typeof language !== 'string') return i18n.t('locale.error.notLanguage');

    if (!availableLanguages.includes(language) && language !== 'none')
      return i18n.t('locale.error.notLanguage');

    if (language === 'none') {
      await changeUserLanguage(drizzle, user.id, null);
      await i18n.changeLanguage(guild?.language || undefined);

      return i18n.t('locale.userLanguageRemoved');
    }

    await i18n.changeLanguage(language);
    await changeUserLanguage(drizzle, user.id, language);

    return i18n.t('locale.userLanguageChanged', { changedTo: language });
  },
  HandlerType.BOTH,
  {
    description: 'Change your individual language',
    options: [
      {
        name: 'language',
        type: ApplicationCommandOptionType.String,
        description:
          "Language you want to change to ('none removes your preference')",
        required: true,
      },
    ],
  },
);

const changeServerLanguage = async (
  drizzle: DrizzleClient,
  guildId: string,
  language: string | null,
) =>
  drizzle
    .update(guilds)
    .set({
      language,
    })
    .where(eq(guilds.id, guildId));

router.use(
  'server',
  async ({ i18n, user, guildUser, params, flags, msg, drizzle }) => {
    const [language] = flags.get('language') || params;
    const { member } = msg;
    const availableLanguages = Object.keys(
      i18n.services.resourceStore.data,
    ).sort();

    if (typeof language !== 'string') return i18n.t('locale.error.notLanguage');

    if (!availableLanguages.includes(language) && language !== 'none')
      return i18n.t('locale.error.notLanguage');
    if (
      !member ||
      !member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return i18n.t('locale.error.notAdmin');

    if (language === 'none') {
      changeServerLanguage(drizzle, guildUser.guildId, null);
      await i18n.changeLanguage(user.language || undefined);

      return i18n.t('locale.guildLanguageRemoved');
    }

    await i18n.changeLanguage(language);
    changeServerLanguage(drizzle, guildUser.guildId, null);

    return i18n.t('locale.guildLanguageChanged', { changedTo: language });
  },
  HandlerType.GUILD,
  {
    description: "Change the server's default language",
    options: [
      {
        name: 'language',
        type: ApplicationCommandOptionType.String,
        description: 'Language you want to change to',
        required: true,
      },
    ],
  },
);

if (process.env.NODE_ENV !== 'production') {
  router.use('test', ({ i18n }) => i18n.t('hello'), HandlerType.BOTH, {
    description: 'Test your locale',
  });
}

export default router;
