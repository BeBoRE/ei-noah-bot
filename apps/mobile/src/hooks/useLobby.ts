import { api } from "src/utils/api";

const useLobby = () => {
  const {data: activeLobby} = api.lobby.activeLobby.useQuery(undefined);

  return activeLobby;
}

export default useLobby;
