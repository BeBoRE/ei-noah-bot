import {
  Entity, ManyToOne, OneToMany, PrimaryKeyType, Property, Collection, PrimaryKey, Unique,
} from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import { User } from './User';
// eslint-disable-next-line import/no-cycle
import { Guild } from './Guild';
// eslint-disable-next-line import/no-cycle
import Quote from './Quote';

@Entity()
@Unique({
  properties: ['guild', 'user'],
  name: 'unique_guild_user',
})
@Unique({
  properties: 'tempChannel',
  name: 'unique_tempchannel',
})
// eslint-disable-next-line import/prefer-default-export
export class GuildUser {
  @PrimaryKey()
  id!: number;

  @ManyToOne({ eager: true })
  guild!: Guild;

  @ManyToOne({ eager: true })
  user!: User;

  [PrimaryKeyType]: [string, string];

  @Property({ nullable: true })
  tempChannel?: string;

  @Property({ nullable: true })
  tempCreatedAt?: Date;

  @OneToMany('Quote', 'guildUser')
  quotes = new Collection<Quote>(this);

  @OneToMany('Quote', 'creator')
  createdQuotes = new Collection<Quote>(this);
}
