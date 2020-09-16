import {
  Entity, ManyToOne, PrimaryKey, Property,
} from 'mikro-orm';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';

@Entity()
class Quote {
  @PrimaryKey({ serializedPrimaryKey: true })
  private id!: number;

  @ManyToOne()
  guildUser!: GuildUser;

  @Property()
  text!: string;

  constructor(text : string) {
    this.text = text;
  }
}

export default Quote;
