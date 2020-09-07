import { PrimaryKey, Entity } from 'mikro-orm';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class Channel {
  @PrimaryKey()
  id!: string;
}
