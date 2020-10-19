import { PrimaryKey, Entity, PrimaryKeyType } from '@mikro-orm/core';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class Channel {
  @PrimaryKey()
  id!: string;

  [PrimaryKeyType]: [string];
}
