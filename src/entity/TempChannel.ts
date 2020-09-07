import {
  Entity, PrimaryKey, OneToOne, Property,
} from 'mikro-orm';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class TempChannel {
  @PrimaryKey()
  id!: string;

  @OneToOne()
  guildUser!: GuildUser;

  @Property()
  createdAt!: Date;
}
