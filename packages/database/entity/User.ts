import {
  BaseEntity,
  Collection,
  Entity,
  Index,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';

import { GuildUser } from './GuildUser';

@Entity()
export class User extends BaseEntity<User, 'id'> {
  @PrimaryKey()
  id!: string;

  @OneToMany(() => GuildUser, (gu) => gu.user)
  guildUsers = new Collection<GuildUser>(this);

  @Property()
  count: number = 0;

  @Index()
  @Property()
  birthday?: Date;

  @Property()
  language?: string;

  @Property()
  timezone?: string;

  @Property()
  expoPushToken?: string;
}

export default User;
