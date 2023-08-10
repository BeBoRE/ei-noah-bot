import { BaseEntity, Entity, PrimaryKey } from '@mikro-orm/core';

@Entity()
export class Channel extends BaseEntity<Channel, 'id'> {
  @PrimaryKey()
  id!: string;
}

export default Channel;
