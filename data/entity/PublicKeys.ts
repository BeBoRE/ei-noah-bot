import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export default class PublicKey {
  @PrimaryKey()
  id!: string;

  @Property({ unique: true, length: 269 })
  key!: string;

  @Property()
  expires!: Date;
}
