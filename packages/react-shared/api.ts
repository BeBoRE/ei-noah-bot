import { AppRouter } from "@ei/trpc";
import { createTRPCReact } from "@trpc/react-query";

export const api = createTRPCReact<AppRouter>();
