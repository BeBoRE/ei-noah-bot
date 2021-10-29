import { EntityManager } from '@mikro-orm/postgresql';
import {
  Channel, CommandInteraction, Message, Role, User as DiscordUser,
} from 'discord.js';
import { i18n as I18n } from 'i18next';
import { GuildUser } from '../entity/GuildUser';
import { User } from '../entity/User';
import LazyRouteInfo from './LazyRouteInfo';
import { MsgRouteInfo } from './Router';

export default class LazyMsgRouteInfo extends LazyRouteInfo implements MsgRouteInfo {
  public msg : Message | CommandInteraction;

  constructor(info : {
    params : (string | Channel | DiscordUser | Role)[],
    msg : Message | CommandInteraction,
    flags : Map<string, (string | Channel | DiscordUser | Role | boolean | number)[]>
    em : EntityManager,
    guildUserOrUser : GuildUser | User,
    i18n : I18n
  }) {
    super(info);

    this.msg = info.msg;
  }
}
