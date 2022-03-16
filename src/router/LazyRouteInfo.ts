import { Logger } from 'winston';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  AutocompleteInteraction,
  AnyChannel, CommandInteraction, NewsChannel, Role, TextChannel, User as DiscordUser,
} from 'discord.js';
import { i18n as I18n } from 'i18next';
import { getCategoryData } from '../data';
import { Category } from '../entity/Category';
import { GuildUser } from '../entity/GuildUser';
import { User } from '../entity/User';
import { RouteInfo } from './Router';

export default class LazyRouteInfo implements RouteInfo {
  public absoluteParams : (string | AnyChannel | DiscordUser | Role)[];

  public params : (string | AnyChannel | DiscordUser | Role)[];

  public msg : CommandInteraction | AutocompleteInteraction;

  public flags : Map<string, (string | AnyChannel | DiscordUser | Role | boolean | number)[]>;

  public em : EntityManager;

  public guildUser : GuildUser | null;

  public user : User;

  public i18n : I18n;

  public logger : Logger;

  private lazyCategory : undefined | null | Promise<Category>;

  public get category() {
    if (this.lazyCategory === undefined) {
      if (((this.msg.channel instanceof TextChannel) || (this.msg.channel instanceof NewsChannel)) && this.msg.channel.parent) {
        this.lazyCategory = getCategoryData(this.em, this.msg.channel.parent);
      } else {
        this.lazyCategory = null;
      }
    }

    return this.lazyCategory;
  }

  constructor({
    params,
    msg,
    flags,
    em,
    guildUserOrUser,
    i18n,
    logger,
  } : {
    params : (string | AnyChannel | DiscordUser | Role)[],
    msg : CommandInteraction | AutocompleteInteraction,
    flags : Map<string, (string | AnyChannel | DiscordUser | Role | boolean | number)[]>
    em : EntityManager,
    guildUserOrUser : GuildUser | User,
    i18n : I18n,
    logger : Logger
  }) {
    this.absoluteParams = params;
    this.params = params;
    this.flags = flags;
    this.msg = msg;
    this.em = em;
    this.logger = logger;

    if (guildUserOrUser instanceof GuildUser) {
      this.guildUser = guildUserOrUser;
      this.user = guildUserOrUser.user;
    } else {
      this.guildUser = null;
      this.user = guildUserOrUser;
    }

    this.i18n = i18n;
  }
}
