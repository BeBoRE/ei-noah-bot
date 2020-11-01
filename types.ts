import { EntityManager } from '@mikro-orm/core';
import { Client } from 'discord.js';
import { NextApiRequest } from 'next';
// eslint-disable-next-line import/no-cycle
import { ExtendedUser } from './data/data';

export interface ReqExtended extends NextApiRequest {
  em: EntityManager,
  user: ExtendedUser | null
  bot: Client
  logout: () => void
}
