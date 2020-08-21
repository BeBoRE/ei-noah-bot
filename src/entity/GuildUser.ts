import {
  Entity, ManyToOne, PrimaryColumn, Column,
} from 'typeorm';
import { User } from './User';
import { Guild } from './Guild';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class GuildUser {
  @PrimaryColumn()
  private guildId: string;

  @ManyToOne(() => Guild, { eager: true })
  guild: Guild;

  @PrimaryColumn()
  private userId: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column({ nullable: true })
  tempChannel?: string;
}
