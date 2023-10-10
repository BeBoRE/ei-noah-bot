/// <reference types="lucia" />
declare namespace Lucia {
	type Auth = import("@ei/lucia").Auth;
	type DatabaseUserAttributes = Record<string, unknown>;
	type DatabaseSessionAttributes = Record<string, unknown>;
}
