import {
  Entity, ManyToOne, PrimaryKey, Property,
} from 'mikro-orm';
import User from './User';

@Entity()
class AccessToken {
  @PrimaryKey()
  token!: string;

  @ManyToOne({ unique: true })
  user!: User;

  @Property()
  expires!: Date;
}

export default AccessToken;
