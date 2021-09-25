import { EntityManager } from '@mikro-orm/postgresql';
import {
  Channel, CommandInteraction, Message, NewsChannel, Role, TextChannel, User as DiscordUser,
} from 'discord.js';
import { i18n as I18n } from 'i18next';
import { getCategoryData } from '../data';
import { Category } from '../entity/Category';
import { GuildUser } from '../entity/GuildUser';
import { User } from '../entity/User';
import { RouteInfo } from './Router';

export default class LazyRouteInfo implements RouteInfo {
  public absoluteParams : (string | Channel | DiscordUser | Role)[];

  public params : (string | Channel | DiscordUser | Role)[];

  public msg : Message | CommandInteraction;

  public flags : Map<string, (string | Channel | DiscordUser | Role | boolean | number)[]>;

  public em : EntityManager;

  public guildUser : GuildUser | null;

  public user : User;

  public i18n : I18n;

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
  } : {
    params : (string | Channel | DiscordUser | Role)[],
    msg : Message | CommandInteraction,
    flags : Map<string, (string | Channel | DiscordUser | Role | boolean | number)[]>
    em : EntityManager,
    guildUserOrUser : GuildUser | User,
    i18n : I18n
  }) {
    this.absoluteParams = params;
    this.params = params;
    this.flags = flags;
    this.msg = msg;
    this.em = em;

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
