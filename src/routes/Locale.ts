import { ApplicationCommandOptionType, Message, PermissionsBitField } from 'discord.js';
import Router, { HandlerType } from '../router/Router';

const router = new Router('Select your language');

router.use('help', ({ i18n }) => i18n.t('locale.help', { joinArrays: '\n' }), HandlerType.BOTH, {
  description: 'Help menu',
});

router.use('languages', ({ i18n }) => i18n.t('locale.availableLanguages', { languages: Object.keys(i18n.services.resourceStore.data).sort().join(' ') }), HandlerType.BOTH, {
  description: 'Get all available languages',
});

router.use('user', async ({
  i18n, user, params, flags, guildUser,
}) => {
  const [language] = flags.get('language') || params;
  const availableLanguages = Object.keys(i18n.services.resourceStore.data).sort();

  if (typeof language !== 'string') return i18n.t('locale.error.notLanguage');

  if (!availableLanguages.includes(language) && language !== 'none') return i18n.t('locale.error.notLanguage');

  if (language === 'none') {
    // eslint-disable-next-line no-param-reassign
    user.language = undefined;
    await i18n.changeLanguage(guildUser?.guild.language);

    return i18n.t('locale.userLanguageRemoved');
  }

  await i18n.changeLanguage(language);
  // eslint-disable-next-line no-param-reassign
  user.language = language;

  return i18n.t('locale.userLanguageChanged', { changedTo: language });
}, HandlerType.BOTH, {
  description: 'Change your individual language',
  options: [{
    name: 'language',
    type: ApplicationCommandOptionType.String,
    description: "Language you want to change to ('none removes your preference')",
    required: true,
  }],
});

router.use('server', async ({
  i18n, guildUser, params, flags, msg,
}) => {
  const [language] = flags.get('language') || params;
  const member = msg instanceof Message ? await msg.guild.members.fetch({ user: msg.author, cache: true }).catch(() => null) : msg.member;
  const availableLanguages = Object.keys(i18n.services.resourceStore.data).sort();

  if (typeof language !== 'string') return i18n.t('locale.error.notLanguage');

  if (!availableLanguages.includes(language) && language !== 'none') return i18n.t('locale.error.notLanguage');
  if (!member || !member.permissions.has(PermissionsBitField.Flags.Administrator)) return i18n.t('locale.error.notAdmin');

  if (language === 'none') {
    // eslint-disable-next-line no-param-reassign
    guildUser.guild.language = undefined;
    await i18n.changeLanguage(guildUser.user.language);

    return i18n.t('locale.guildLanguageRemoved');
  }

  await i18n.changeLanguage(language);
  // eslint-disable-next-line no-param-reassign
  guildUser.guild.language = language;

  return i18n.t('locale.guildLanguageChanged', { changedTo: language });
}, HandlerType.GUILD, {
  description: 'Change the server\'s default language',
  options: [{
    name: 'language',
    type: ApplicationCommandOptionType.String,
    description: 'Language you want to change to',
    required: true,
  }],
});

if (process.env.NODE_ENV !== 'production') {
  router.use('test', ({ i18n }) => i18n.t('hello'), HandlerType.BOTH, {
    description: 'Test your locale',
  });
}

export default router;
