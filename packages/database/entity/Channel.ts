import {
  PrimaryKey, Entity, BaseEntity,
} from '@mikro-orm/core';

@Entity()
export class Channel extends BaseEntity<Channel, 'id'> {
  @PrimaryKey()
    id!: string;
}
