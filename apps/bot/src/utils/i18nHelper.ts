import { type Guild } from "@ei/database/entity/Guild";
import { type User } from "@ei/database/entity/User";
import { type i18n } from "i18next";

const defaultLanguage = "nl";

export const createI18nClone = (i18n : i18n, locale: string) => {
  const newI18n = i18n.cloneInstance({ lng: locale });
}

export const getLocale = ({user, guild} : { user?: User, guild?: Guild}) => {
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
}
