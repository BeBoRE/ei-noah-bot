import { EntityManager } from '@mikro-orm/postgresql';
import {
  AnyChannel,
  CommandInteraction, Role, User as DiscordUser,
} from 'discord.js';
import { i18n as I18n } from 'i18next';
import { Logger } from 'winston';
import { GuildUser } from '../entity/GuildUser';
import { User } from '../entity/User';
import LazyRouteInfo from './LazyRouteInfo';
import { MsgRouteInfo } from './Router';

export default class LazyMsgRouteInfo extends LazyRouteInfo implements MsgRouteInfo {
  public msg : CommandInteraction;

  constructor(info : {
    params : (string | AnyChannel | DiscordUser | Role)[],
    msg : CommandInteraction,
    flags : Map<string, (string | AnyChannel | DiscordUser | Role | boolean | number)[]>
    em : EntityManager,
    guildUserOrUser : GuildUser | User,
    i18n : I18n,
    logger : Logger
  }) {
    super(info);

    this.msg = info.msg;
  }
}
