import {
  BaseEntity, Entity, ManyToOne, PrimaryKey, Property,
} from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import { GuildUser } from './GuildUser';

@Entity()
class LobbyNameChange extends BaseEntity<LobbyNameChange, 'id'> {
  @PrimaryKey()
    id!: number;

  @ManyToOne('GuildUser', { index: true })
    guildUser!: GuildUser;

  @Property({ length: 99 })
    name!: string;

  @Property()
    date: Date = new Date();
}

export default LobbyNameChange;
