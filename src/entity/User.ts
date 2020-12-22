import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class User {
  @PrimaryColumn()
  id: string;

  @Column()
  count: number = 0;

  @Column()
  birthday?: Date;
}
