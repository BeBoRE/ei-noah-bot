/// <reference types="lucia" />
declare namespace Lucia {
  type Auth = import('./lucia').Auth;
  type DatabaseUserAttributes = Record<string, unknown>;
}
