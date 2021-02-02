import {
  Entity, ManyToOne, PrimaryKey, Property,
} from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';

@Entity()
class Quote {
  @PrimaryKey({ serializedPrimaryKey: true })
  id!: number;

  @ManyToOne({ eager: true, entity: 'GuildUser' })
  guildUser!: GuildUser;

  @ManyToOne({ eager: true, entity: 'GuildUser' })
  creator!: GuildUser;

  @Property()
  text!: string;

  @Property()
  date?: Date;

  constructor(text : string, creator: GuildUser) {
    this.text = text;
    this.creator = creator;
    this.date = new Date();
  }
}

export default Quote;
