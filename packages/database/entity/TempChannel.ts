import {
  BaseEntity,
  Entity,
  OneToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';

import type { GuildUser } from './GuildUser';

@Entity()
class TempChannel extends BaseEntity<TempChannel, 'channelId'> {
  constructor(channelId: string, guildUser: GuildUser) {
    super();
    this.channelId = channelId;
    this.guildUser = guildUser;
    this.createdAt = new Date();
  }

  @PrimaryKey()
  channelId!: string;

  @OneToOne({
    entity: 'GuildUser',
    unique: true,
    owner: true,
  })
  guildUser!: GuildUser;

  @Property()
  createdAt!: Date;

  @Property({ length: 98 })
  name?: string;

  @Property({ length: 24 })
  textChannelId?: string;

  @Property({ length: 24 })
  controlDashboardId?: string;
}

export default TempChannel;
