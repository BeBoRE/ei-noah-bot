import {
  Entity, ManyToOne, PrimaryKey, Property,
} from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';

@Entity()
class Quote {
  @PrimaryKey({ serializedPrimaryKey: true })
  private id!: number;

  @ManyToOne({ eager: true })
  guildUser!: GuildUser;

  @ManyToOne({ eager: true })
  creator!: GuildUser;

  @Property()
  text!: string;

  constructor(text : string, creator: GuildUser) {
    this.text = text;
    this.creator = creator;
  }
}

export default Quote;
