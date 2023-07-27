type MikroORM = import('@mikro-orm/postgresql').MikroORM;

declare module NodeJS {
  interface Global {
    __MikroORM__: MikroORM;
  }
}
