"use client";

import { RouterOutputs, api } from "../utils/api";

export function Lobby(props: {lobby: RouterOutputs["lobby"]["all"][number]}) {
  return (
    <div>
      <h1>{props.lobby.channelId}</h1>
      <p>Owner: {props.lobby.guildUser.user.id}</p>
    </div>
  );
}

export function Lobbies() {
  const [users] = api.lobby.all.useSuspenseQuery();

  return (
    <div>
      {users.map((lobby) => (
        <Lobby key={lobby.channelId} lobby={lobby} />
      ))}
    </div>
  );
}
