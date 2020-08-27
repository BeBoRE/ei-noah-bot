import {
  Entity, PrimaryColumn, Column, OneToMany,
} from 'typeorm';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class User {
  @PrimaryColumn()
  id: string;

  @OneToMany(() => GuildUser, (gu) => gu.user)
  guildUsers: GuildUser[];

  @Column()
  count: number = 0;
}
