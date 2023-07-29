import { Suspense } from "react";
import { Users } from "./user";

export default function Page() {
  return (
    <>
      <Suspense fallback={<span>...Loading</span>}>
        <Users/>
      </Suspense>
    </>
  );
}
