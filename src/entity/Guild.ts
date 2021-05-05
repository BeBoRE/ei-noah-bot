import {
  Entity, PrimaryKey, Property, OneToMany, Collection, BaseEntity,
} from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import CustomRole from './CustomRole';
// eslint-disable-next-line import/no-cycle
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
  publicVoice?: string;

  @Property()
  muteVoice?: string;

  @Property()
  privateVoice?: string;

  @Property()
  lobbyCategory?: string;

  @Property()
  roleMenuId?: string;

  @Property()
  defaultColor?: string;

  @Property()
  requiredRole?: string;

  @Property()
  category?: string;
}
