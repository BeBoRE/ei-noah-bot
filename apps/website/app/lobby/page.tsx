'use client';

import { Button } from 'app/_components/ui/button';

import { generateLobbyName } from '@ei/lobby';
import { useLobby } from '@ei/react-shared/context/lobby';

function LobbyScreen() {
  const { lobby } = useLobby();

  if (!lobby)
    return (
      <div className="flex flex-1 justify-center">
        <div className="container flex justify-center">
          <div className="flex w-full max-w-xl flex-col gap-4 p-4">
            <div className="text-center text-4xl font-bold">
              Please join a lobby create channel on{' '}
              <span className="text-discord">Discord</span>
            </div>
          </div>
        </div>
      </div>
    );

  const name = generateLobbyName(
    lobby.channel.type,
    {
      displayName: lobby.user.displayName,
    },
    lobby.channel.name,
  );

  return (
    <div className="flex flex-1 justify-center">
      <div className="container flex justify-center">
        {lobby && (
          <div className="flex w-full max-w-lg flex-col gap-4 p-4">
            <div className="flex flex-row items-center justify-center gap-4">
              <div>
                {lobby.guild.icon ? (
                  <img
                    src={lobby.guild.icon}
                    className="h-24 w-24 rounded-full bg-primary-900"
                    alt=""
                  />
                ) : (
                  <div className="bg-secondary h-24 w-24 rounded-full" />
                )}
              </div>
              <div className="text-4xl font-bold">{lobby.guild.name}</div>
            </div>
            <div className="flex h-16 rounded-full bg-primary-900 p-2 text-center text-2xl font-bold">
              <Button
                variant="secondary"
                className="aspect-square h-full rounded-full text-2xl"
              >
                {name?.icon}
              </Button>
              <div className="flex flex-1 items-center justify-center">
                <span>{name?.name}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LobbyScreen;
