import { type Guild } from "@ei/database/entity/Guild";
import { type User } from "@ei/database/entity/User";

const defaultLanguage = "nl";

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
