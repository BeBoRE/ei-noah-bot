/// <reference types="lucia" />
declare namespace Lucia {
  type Auth = import('./auth').Auth;
  type DatabaseUserAttributes = Record<string, unknown>;
}
