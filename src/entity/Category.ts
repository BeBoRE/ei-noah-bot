import {
  PrimaryKey, Entity, Property, BaseEntity,
} from '@mikro-orm/core';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class Category extends BaseEntity<Category, 'id'> {
  @PrimaryKey()
  id!: string;

  @Property()
  isLobbyCategory: boolean = false;
}
