import {
  Entity, PrimaryKey, Property, OneToMany, Collection,
} from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class Guild {
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
  requierdRole?: string;

  @Property()
  category?: string;
}
