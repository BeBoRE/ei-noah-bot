"use client";

import { RouterOutputs, api } from "./utils/api";

export function User(props: {user: RouterOutputs["user"]["all"][number]}) {
  return (
    <div>
      <h1>{props.user.id}</h1>
    </div>
  );
}

export function Users() {
  const [users] = api.user.all.useSuspenseQuery();

  return (
    <div>
      {users.map((user) => (
        <User key={user.id} user={user} />
      ))}
    </div>
  );
}
