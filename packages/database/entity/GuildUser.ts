import {
  BaseEntity,
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';

import type { Guild } from './Guild';
import LobbyNameChange from './LobbyNameChange';
import Quote from './Quote';
import TempChannel from './TempChannel';
import type { User } from './User';

@Entity()
@Unique({ properties: ['guild', 'user'] })
// eslint-disable-next-line import/prefer-default-export
export class GuildUser extends BaseEntity<GuildUser, 'id'> {
  @PrimaryKey()
  id!: number;

  @ManyToOne({ entity: 'Guild' })
  guild!: Guild;

  @ManyToOne({ entity: 'User' })
  user!: User;

  @OneToOne({
    entity: 'TempChannel',
    mappedBy: 'guildUser',
  })
  tempChannel?: TempChannel;

  @OneToMany({ entity: () => Quote, mappedBy: 'guildUser' })
  quotes = new Collection<Quote>(this);

  @OneToMany({ entity: () => Quote, mappedBy: 'creator' })
  createdQuotes = new Collection<Quote>(this);

  @Property({ length: 20 })
  birthdayMsg?: string;

  @OneToMany(() => LobbyNameChange, (lnc) => lnc.guildUser)
  lobbyNameChanges = new Collection<LobbyNameChange>(this);
}
