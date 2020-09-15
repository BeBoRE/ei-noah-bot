import {
  Entity, ManyToOne, OneToMany, PrimaryKeyType, Property, Collection,
} from 'mikro-orm';
// eslint-disable-next-line import/no-cycle
import { User } from './User';
// eslint-disable-next-line import/no-cycle
import { Guild } from './Guild';
// eslint-disable-next-line import/no-cycle
import Quote from './Quote';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class GuildUser {
  @ManyToOne({ primary: true, eager: true })
  guild: Guild;

  @ManyToOne({ primary: true, eager: true })
  user: User;

  [PrimaryKeyType]: [string, string];

  @Property({ nullable: true, unique: true })
  tempChannel?: string;

  @Property()
  tempCreatedAt?: Date;

  @OneToMany({ entity: () => Quote, mappedBy: 'guildUser' })
  quotes = new Collection<Quote>(this);
}
