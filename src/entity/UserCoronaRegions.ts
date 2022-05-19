import {
  BaseEntity,
  Entity, ManyToOne, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import { User } from './User';

@Entity()
@Unique({ properties: ['user', 'region'] })
class UserCoronaRegions extends BaseEntity<UserCoronaRegions, 'id'> {
  @PrimaryKey()
  id!: number;

  @ManyToOne({ entity: 'User' })
  user!: User;

  @Property()
  region!: string;
}

export default UserCoronaRegions;
