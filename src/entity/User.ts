import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
// eslint-disable-next-line import/prefer-default-export
export class User {
  @PrimaryColumn()
  id: string;

  @PrimaryColumn()
  guildId: string;

  @Column()
  count: number;
}
