import {
  PrimaryKey, Entity, Property,
} from '@mikro-orm/core';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class Category {
  @PrimaryKey()
  id!: string;

  @Property()
  isLobbyCategory: boolean = false;
}