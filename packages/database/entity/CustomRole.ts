import {
  Entity, PrimaryKey, Property, ManyToOne, BaseEntity,
} from '@mikro-orm/core';
import type { Guild } from './Guild';
import type { GuildUser } from './GuildUser';

@Entity()
export default class CustomRole extends BaseEntity<CustomRole, 'id'> {
  @PrimaryKey()
    id!: string;

  @ManyToOne({ entity: 'GuildUser' })
    owner!: GuildUser;

  @ManyToOne({ entity: 'Guild' })
    guild!: Guild;

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
