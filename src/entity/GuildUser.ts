import {
  Entity, ManyToOne, PrimaryColumn,
} from 'typeorm';
import { User } from './User';
import { Guild } from './Guild';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class GuildUser {
  @PrimaryColumn()
  guildId: string;

  @ManyToOne(() => Guild, { eager: true })
  guild: Guild;

  @PrimaryColumn()
  userId: string;

  @ManyToOne(() => User, { eager: true })
  user: User;
}
