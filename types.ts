import { EntityManager } from '@mikro-orm/core';
import { Client } from 'discord.js';
import { User } from './data/entity/User';

export interface ReqExtended {
  em: EntityManager,
  user: User | null
  bot: Client
}
