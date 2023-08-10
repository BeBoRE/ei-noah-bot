import {
  PrimaryKey, Entity, Property, BaseEntity,
} from '@mikro-orm/core';

@Entity()
export class Category extends BaseEntity<Category, 'id'> {
  @PrimaryKey()
    id!: string;

  @Property()
    publicVoice?: string;

  @Property()
    muteVoice?: string;

  @Property()
    privateVoice?: string;

  @Property()
    lobbyCategory?: string;
}

export default Category;
