import { ContextMenuCommandInteraction } from 'discord.js';
import { EntityManager } from '@mikro-orm/postgresql';
import { i18n as I18n } from 'i18next';
import { Logger } from 'winston';
import { GuildUser } from '../entity/GuildUser';
import { User } from '../entity/User';

export default class ContextMenuInfo {
  public interaction : ContextMenuCommandInteraction;

  public em : EntityManager;

  public i18n : I18n;

  public user : User;

  public guildUser : GuildUser | null;

  public logger : Logger;

  constructor(interaction : ContextMenuCommandInteraction, guildUserOrUser : GuildUser | User, em : EntityManager, i18n : I18n, logger : Logger) {
    this.i18n = i18n;
    this.interaction = interaction;
    this.em = em;
    this.logger = logger;

    if (guildUserOrUser instanceof GuildUser) {
      this.guildUser = guildUserOrUser;
      this.user = guildUserOrUser.user;
    } else {
      this.guildUser = null;
      this.user = guildUserOrUser;
    }
  }
}
