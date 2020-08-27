import {
  Entity, PrimaryColumn, Column, OneToMany,
} from 'typeorm';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class Guild {
  @PrimaryColumn()
  id: string;

  @Column({ default: 96000 })
  bitrate: number = 96000;

  @OneToMany(() => GuildUser, (gu) => gu.guild)
  guildUsers: GuildUser[];
}
