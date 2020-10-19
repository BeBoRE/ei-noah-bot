import { EntityManager } from 'mikro-orm';
import { User } from '../data/entity/User';

export interface ReqExtended {
  em: EntityManager,
  user: User | null
}
