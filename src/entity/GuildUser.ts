import {
  Entity, ManyToOne, PrimaryColumn,
} from 'typeorm';
import { User } from './User';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class GuildUser {
  @PrimaryColumn()
  guildId: string;

  @PrimaryColumn()
  userId: string;

  @ManyToOne(() => User, { eager: true })
  user: User;
}
