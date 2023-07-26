declare module NodeJS {
  interface Global {
    __MikroORM__: PostgreSqlMikroORM;
  }
}
