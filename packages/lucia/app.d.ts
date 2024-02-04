/// <reference types="lucia" />

declare namespace Lucia {
  type Auth = import('./auth').Auth;
  type DatabaseUserAttributes =
    typeof import('@ei/drizzle/tables/schema').users.$inferInsert;
  type DatabaseSessionAttributes =
    typeof import('@ei/drizzle/tables/schema').session.$inferInsert;
}
