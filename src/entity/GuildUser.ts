import {
  Entity, ManyToOne, OneToOne, PrimaryKey, PrimaryKeyType,
} from 'mikro-orm';
// eslint-disable-next-line import/no-cycle
import { User } from './User';
// eslint-disable-next-line import/no-cycle
import { Guild } from './Guild';
// eslint-disable-next-line import/no-cycle
import { TempChannel } from './TempChannel';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class GuildUser {
  @ManyToOne({ primary: true, eager: true })
  guild: Guild;

  @ManyToOne({ primary: true, eager: true })
  user: User;

  [PrimaryKeyType]: [string, string];

  @OneToOne(() => TempChannel, (tc) => tc.guildUser, { eager: true })
  tempChannel: TempChannel;
}
