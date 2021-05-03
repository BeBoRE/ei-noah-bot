import {
  Entity, PrimaryKey, Property, ManyToOne,
} from '@mikro-orm/core';
import { GuildUser } from './GuildUser';

@Entity()
export default class CustomRole {
  @PrimaryKey()
  id!: string;

  @ManyToOne({ eager: true, entity: 'GuildUser' })
  owner!: GuildUser;

  @Property()
  roleName!: string;

  @Property()
  maxUsers?: number;

  @Property()
  expireDate?: Date;

  @Property()
  reactionIcon!: string;

  @Property()
  channelId?: string;
}
