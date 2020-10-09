import {
  Entity, ManyToOne, PrimaryKey, Property,
} from 'mikro-orm';
// eslint-disable-next-line import/no-cycle
import { User } from './User';

@Entity()
class UserCoronaRegions {
  @PrimaryKey()
  private id!: number;

  @ManyToOne({ unique: 'userRegion' })
  user!: User;

  @Property({ unique: 'userRegion' })
  region!: string;
}

export default UserCoronaRegions;
