import { Message } from 'discord.js';
import Router, { HandlerType } from '../router/Router';

const router = new Router('Select your language');
router.use('languages', ({ i18n }) => i18n.t('locale.availableLanguages', { languages: Object.keys(i18n.services.resourceStore.data).sort().join(' ') }), HandlerType.BOTH, {
  description: 'Get all available languages',
});

router.use('user', async ({
  i18n, user, params, flags,
}) => {
  const [language] = flags.get('language') || params;
  const availableLanguages = Object.keys(i18n.services.resourceStore.data).sort();

  if (typeof language !== 'string') return i18n.t('locale.error.notLanguage');

  if (!availableLanguages.includes(language)) return i18n.t('locale.error.notLanguage');

  await i18n.changeLanguage(language);
  // eslint-disable-next-line no-param-reassign
  user.language = language;

  return i18n.t('locale.userLanguageChanged', { changedTo: language });
}, HandlerType.BOTH, {
  description: 'Change your individual language',
  options: [{
    name: 'language',
    type: 'STRING',
    description: 'Language you want to change to',
    required: true,
  }],
});

router.use('guild', async ({
  i18n, guildUser, params, flags, msg,
}) => {
  const [language] = flags.get('language') || params;
  const member = msg instanceof Message ? await msg.guild.members.fetch({ user: msg.author, cache: true }).catch(() => null) : msg.member;
  const availableLanguages = Object.keys(i18n.services.resourceStore.data).sort();

  if (typeof language !== 'string') return i18n.t('locale.error.notLanguage');

  if (!availableLanguages.includes(language)) return i18n.t('locale.error.notLanguage');
  if (!member || !member.permissions.has('ADMINISTRATOR')) return i18n.t('locale.error.notAdmin');

  await i18n.changeLanguage(language);
  // eslint-disable-next-line no-param-reassign
  guildUser.guild.language = language;

  return i18n.t('locale.guildLanguageChanged', { changedTo: language });
}, HandlerType.GUILD, {
  description: 'Change your guilds default language',
  options: [{
    name: 'language',
    type: 'STRING',
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
