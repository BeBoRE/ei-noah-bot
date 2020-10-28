/// <reference types="next" />
/// <reference types="next/types/global" />

import { MikroORM, IDatabaseDriver, Connection } from '@mikro-orm/core';
import EiNoah from './bot/EiNoah';

declare global {
  namespace NodeJS {

    interface Global {
      bot: EiNoah | undefined
      orm: Promise<MikroORM<IDatabaseDriver<Connection>>> | undefined
    }
  }
}
