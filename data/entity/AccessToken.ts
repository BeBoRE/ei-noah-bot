import {
  Entity, ManyToOne, PrimaryKey, Property,
} from '@mikro-orm/core';
import { User } from './User';

@Entity()
class AccessToken {
  @PrimaryKey({ length: 600 })
  token!: string;

  @ManyToOne({ unique: true })
  user!: User;

  @Property()
  expires!: Date;
}

export default AccessToken;
