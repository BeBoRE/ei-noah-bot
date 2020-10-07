import {
  Entity, ManyToOne, PrimaryKey, Property,
} from 'mikro-orm';
import { User } from './User';

@Entity()
class UserCoronaRegions {
  @PrimaryKey()
  id!: number;

  @ManyToOne({ unique: 'userRegion' })
  user!: User;

  @Property({ unique: 'userRegion' })
  region!: string;
}

export default UserCoronaRegions;
