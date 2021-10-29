import { EntityManager } from '@mikro-orm/postgresql';
import {
  AutocompleteInteraction,
  Channel, Role, User as DiscordUser,
} from 'discord.js';
import { i18n as I18n } from 'i18next';
import { GuildUser } from '../entity/GuildUser';
import { User } from '../entity/User';
import LazyRouteInfo from './LazyRouteInfo';
import { AutocompleteRouteInfo } from './Router';

export default class LazyAutocompleteRouteInfo extends LazyRouteInfo implements AutocompleteRouteInfo {
  public msg : AutocompleteInteraction;

  constructor(info : {
    params : (string | Channel | DiscordUser | Role)[],
    msg : AutocompleteInteraction,
    flags : Map<string, (string | Channel | DiscordUser | Role | boolean | number)[]>
    em : EntityManager,
    guildUserOrUser : GuildUser | User,
    i18n : I18n
  }) {
    super(info);

    this.msg = info.msg;
  }
}
