import { Guild, User } from '@ei/drizzle/tables/schema';

const defaultLanguage = 'en';

export const getLocale = ({
  user,
  guild,
}: {
  user?: User | null;
  guild?: Guild | null;
}) => {
  // Prioritize user locale
  if (user && user.language) {
    return user.language;
  }

  // Then guild locale
  if (guild && guild.language) {
    return guild.language;
  }

  // Then default locale
  return defaultLanguage;
};

export default getLocale;
