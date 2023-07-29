import { Suspense } from "react";
import { Users } from "./user";
import { Lobbies } from "./lobby";

export default function Page() {
  return (
    <>
      <Suspense fallback={<span>...Loading</span>}>
        <Users/>
        <Lobbies></Lobbies>
      </Suspense>
    </>
  );
}
