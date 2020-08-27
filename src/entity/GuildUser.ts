import {
  Entity, ManyToOne, PrimaryColumn, OneToOne,
} from 'typeorm';
import { User } from './User';
import { Guild } from './Guild';
// eslint-disable-next-line import/no-cycle
import { TempChannel } from './TempChannel';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class GuildUser {
  @PrimaryColumn()
  private guildId: string;

  @ManyToOne(() => Guild, (g) => g.guildUsers, { eager: true })
  guild: Guild;

  @PrimaryColumn()
  private userId: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @OneToOne(() => TempChannel, (temp) => temp.guildUser)
  tempChannel: Promise<TempChannel>;
}
