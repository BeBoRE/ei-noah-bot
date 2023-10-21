'use client';

import { Button } from 'app/_components/ui/button';

import { ChannelType, generateLobbyName } from '@ei/lobby';
import { useLobby } from '@ei/react-shared/context/lobby';

import { AnimatePresence, motion } from 'framer-motion';

const lobbyTypeEmoji = {
  [ChannelType.Public]: '🔊',
  [ChannelType.Mute]: '🙊',
  [ChannelType.Nojoin]: '🔒',
};

function LobbyScreen() {
  const { lobby, changeChannelType, changeUserLimit } = useLobby();

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

  const limits = new Set([0, 2, 5, 10, lobby.channel.limit || 0]);

  return (  
    <div className="flex flex-1 justify-center">
      <div className="container flex justify-center">
        {lobby && (
          <div className="flex w-full max-w-lg flex-col gap-3 p-4">
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
                className="aspect-square h-full rounded-full text-2xl relative overflow-hidden"
              >
                <AnimatePresence initial={false}>
                  <motion.span
                    key={name?.icon}
                    className='absolute inset-0 flex items-center justify-center'
                    initial={{ y: -50, opacity: 1 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 1 }}
                  >
                    {name?.icon}
                  </motion.span>
                </AnimatePresence>
              </Button>
              <div className="flex flex-1 items-center justify-center">
                <span>{name?.name}</span>
              </div>
            </div>
            <div className="flex h-16 rounded-full bg-primary-900 p-2 text-center text-2xl font-bold justify-center gap-8">
              {[ChannelType.Public, ChannelType.Mute, ChannelType.Nojoin].map(
                (type) => (
                  <Button
                    key={type}
                    variant="ghost"
                    className="aspect-square h-full rounded-full text-2xl relative hover:bg-primary-800/20"
                    onClick={() => changeChannelType(type)}
                  >
                    {lobby.channel.type === type && (
                      <motion.div layoutId='type-selected' className="absolute inset-0 rounded-full bg-primary-800" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center">
                     {lobbyTypeEmoji[type]}
                    </span>
                  </Button>
                ),
              )}
            </div>
            <div className="flex h-16 rounded-full bg-primary-900 p-2 text-center text-2xl font-bold justify-center gap-8">
              {Array.from(limits)
                .sort((a, b) => a - b)
                .map((limit) => (
                  <Button
                    key={limit}
                    variant="outline"
                    className="aspect-square h-full rounded-full text-2xl relative hover:bg-primary-800/20"
                    onClick={() => changeUserLimit(limit)}
                  >
                    {lobby.channel.limit === limit && (
                      <motion.div layoutId='user-limit-selected' className="absolute inset-0 rounded-full bg-primary-800" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center">
                      {limit === 0 ? '∞' : limit}
                    </span>
                  </Button>
                ))}
              </div>
          </div>
        )}
      </div>
    </div>
    
  );
}

export default LobbyScreen;
