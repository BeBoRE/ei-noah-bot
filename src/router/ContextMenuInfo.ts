import { ContextMenuInteraction } from 'discord.js';
import { EntityManager } from '@mikro-orm/postgresql';
import { GuildUser } from 'entity/GuildUser';
import { getUserData, getUserGuildData } from '../data';
import { User } from '../entity/User';

export default class ContextMenuInfo {
  public interaction : ContextMenuInteraction;

  public em : EntityManager;

  constructor(interaction : ContextMenuInteraction, em : EntityManager) {
    this.interaction = interaction;
    this.em = em;
  }

  private lazyUser : undefined | Promise<User>;

  public get user() {
    if (this.lazyGuildUser) {
      throw new Error('Don\'t use both guildUser and user');
    }

    if (!this.lazyUser) this.lazyUser = getUserData(this.em, this.interaction.user);
    return this.lazyUser;
  }

  private lazyGuildUser : undefined | null | Promise<GuildUser>;

  public get guildUser() {
    if (this.lazyUser) {
      throw new Error('Don\'t use both guildUser and user');
    }

    if (this.lazyGuildUser === undefined) {
      if (!this.interaction.guild) {
        this.lazyGuildUser = null;
      } else {
        this.lazyGuildUser = getUserGuildData(this.em, this.interaction.user, this.interaction.guild);
      }
    }

    return this.lazyGuildUser;
  }
}
