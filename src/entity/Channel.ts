import {
  Entity, PrimaryColumn,
} from 'typeorm';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class Channel {
  @PrimaryColumn()
  id: string;
}