import {
  BaseEntity,
  Cascade,
  Collection,
  Entity,
  Index,
  OneToMany,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';

import { defaultEntities } from '@auth/mikro-orm-adapter';
import { GuildUser } from './GuildUser';

export const { Account, Session } = defaultEntities;

@Entity()
// eslint-disable-next-line import/prefer-default-export
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

  @Property({ nullable: true })
  name?: string;

  @Property({ nullable: true })
  @Unique()
  email?: string;

  @Property({ type: "Date", nullable: true })
  emailVerified: Date | null = null;

  @Property({ nullable: true })
  image?: string;

  @OneToMany({
    entity: () => Session,
    mappedBy: (session) => session.user,
    hidden: true,
    orphanRemoval: true,
    cascade: [Cascade.ALL],
  })
  sessions = new Collection<typeof Session>(this);

  @OneToMany({
    entity: () => Account,
    mappedBy: (account) => account.user,
    hidden: true,
    orphanRemoval: true,
    cascade: [Cascade.ALL],
  })
  accounts = new Collection<typeof Account>(this);
}
