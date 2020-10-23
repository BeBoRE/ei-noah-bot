import { EntityManager } from '@mikro-orm/core';
import { Client } from 'discord.js';
// eslint-disable-next-line import/no-cycle
import { ExtendedUser } from './lib/passport';

export interface ReqExtended {
  em: EntityManager,
  user: ExtendedUser | null
  bot: Client
}
