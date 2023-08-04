import { api } from "src/utils/api";

const useLobby = () => {
  const {data: activeLobby} = api.lobby.activeLobby.useQuery(undefined, {refetchInterval: 1000, retry: (_, err) => {return err.data?.code !== 'UNAUTHORIZED'}});

  return activeLobby;
}

export default useLobby;
