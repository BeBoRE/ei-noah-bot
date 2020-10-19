import {
  Entity, PrimaryKey, OneToMany, Property, Collection,
} from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';
// eslint-disable-next-line import/no-cycle
import UserCoronaRegions from './UserCoronaRegions';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class User {
  @PrimaryKey()
  id!: string;

  @OneToMany('GuildUser', 'user')
  guildUsers = new Collection<GuildUser>(this);

  @OneToMany('UserCoronaRegions', 'user')
  coronaRegions = new Collection<UserCoronaRegions>(this);

  @Property()
  count: number = 0;
}
