import {
  Entity, ManyToOne, OneToMany, Collection, PrimaryKey, Unique, OneToOne, BaseEntity, Property,
} from '@mikro-orm/core';
import type { User } from './User';
import type { Guild } from './Guild';
import Quote from './Quote';
import type TempChannel from './TempChannel';
import LobbyNameChange from './LobbyNameChange';

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
    entity: 'TempChannel', mappedBy: 'guildUser',
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
