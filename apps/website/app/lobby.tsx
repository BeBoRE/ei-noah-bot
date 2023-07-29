"use client";

import Image from "next/image";
import { RouterOutputs, api } from "../utils/api";

export function Lobby(props: {data: RouterOutputs["lobby"]["all"][number]}) {
  if(!props.data.guild.success) return <div><p>Error loading guild</p></div>
  
  const guild = props.data.guild.data;

  return (
    <div>
      {guild.icon ? <Image src={guild.icon} alt={`${guild.name}'s icon`} width={256} height={256} /> : null}
      <h1>{guild.name}</h1>
      <p>Owner: {props.data.channel.guildUser.user.id}</p>
    </div>
  );
}

export function Lobbies() {
  const [lobbies] = api.lobby.all.useSuspenseQuery();

  return (
    <div>
      {lobbies.map((data) => (
        <Lobby key={data.channel.channelId} data={data} />
      ))}
    </div>
  );
}
