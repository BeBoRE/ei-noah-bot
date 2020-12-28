import {
  Entity, PrimaryKey, Property, OneToMany, Collection, PrimaryKeyType,
} from 'mikro-orm';
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

  [PrimaryKeyType]: [string];
}
