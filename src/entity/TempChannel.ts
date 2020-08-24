import {
  Entity, PrimaryColumn, CreateDateColumn, OneToOne, JoinColumn,
} from 'typeorm';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class TempChannel {
  @PrimaryColumn()
  id: string;

  @JoinColumn()
  @OneToOne(() => GuildUser, (gu) => gu.tempChannel, { eager: true })
  guildUser: GuildUser;

  @CreateDateColumn()
  createdAt: Date;
}
