import {
  Entity, PrimaryKey, OneToMany, Property, Collection,
} from 'mikro-orm';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class User {
  @PrimaryKey()
  id!: string;

  @OneToMany(() => GuildUser, (gu) => gu.user)
  guildUsers = new Collection<GuildUser>(this);

  @Property()
  count: number = 0;

  @Property()
  lastCoronaReport ?: Date;
}
