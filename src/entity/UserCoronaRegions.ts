import { User } from 'discord.js';
import { Entity, PrimaryKey, Unique } from 'mikro-orm';

@Entity()
class UserCoronaRegions {
  @PrimaryKey()
  id!: number;

  @Unique({ name: 'userRegion' })
  user!: User;

  @Unique({ name: 'userRegion' })
  region!: string;
}

export default UserCoronaRegions;
