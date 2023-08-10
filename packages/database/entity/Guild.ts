import {
  BaseEntity,
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';

import CustomRole from './CustomRole';
import { GuildUser } from './GuildUser';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class Guild extends BaseEntity<Guild, 'id'> {
  @PrimaryKey()
  id!: string;

  @Property({ default: 96000 })
  bitrate: number = 96000;

  @Property()
  birthdayChannel?: string;

  @Property()
  birthdayRole?: string;

  @OneToMany(() => GuildUser, (gu) => gu.guild)
  guildUsers = new Collection<GuildUser>(this);

  @OneToMany(() => CustomRole, (cr) => cr.guild)
  customRoles = new Collection<CustomRole>(this);

  @Property()
  roleMenuId?: string;

  @Property()
  defaultColor?: string;

  @Property()
  requiredRole?: string;

  @Property()
  category?: string;

  @Property()
  language?: string;

  @Property({ default: false })
  seperateTextChannel!: boolean;
}
