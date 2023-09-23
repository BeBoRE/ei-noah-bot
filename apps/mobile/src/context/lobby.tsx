import { createContext, useContext, useMemo, useState } from 'react';
import { useAppState } from '@react-native-community/hooks';
import { api } from 'src/utils/api';

import { ChannelType, LobbyChange } from '@ei/lobby';

import { useAuth } from './auth';

type LobbyContextProps = {
  lobby: LobbyChange | null;
  changeChannelType: (type: ChannelType) => void;
  changeUserLimit: (limit: number) => void;
};

const lobbyContext = createContext<LobbyContextProps>({
  lobby: null,
  changeChannelType: () => {
    throw new Error('Outside of provider');
  },
  changeUserLimit: () => {
    throw new Error('Outside of provider');
  },
});

export function useLobby() {
  return useContext(lobbyContext);
}

export function LobbyProvider({ children }: { children: React.ReactNode }) {
  const [lobby, setLobby] = useState<LobbyChange | null>(null);

  const { mutate: changeLobby } = api.lobby.changeLobby.useMutation();

  const { authInfo } = useAuth();
  const appState = useAppState();

  api.lobby.lobbyUpdate.useSubscription(authInfo?.accessToken || '', {
    enabled:
      !!authInfo?.accessToken &&
      (appState === 'active' || appState === 'inactive'),
    onData: (data) => {
      setLobby(data);
    },
  });

  const props = useMemo(
    () => ({
      lobby,
      changeChannelType: (type: ChannelType) => {
        // Optimistic update
        setLobby((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            channel: {
              ...prev.channel,
              type,
            },
          };
        });

        changeLobby({
          type,
        });
      },
      changeUserLimit: (limit: number) => {
        // Optimistic update
        setLobby((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            channel: {
              ...prev.channel,
              limit,
            },
          };
        });

        changeLobby({
          limit,
        });
      },
    }),
    [changeLobby, lobby],
  );

  return (
    <lobbyContext.Provider value={props}>{children}</lobbyContext.Provider>
  );
}
