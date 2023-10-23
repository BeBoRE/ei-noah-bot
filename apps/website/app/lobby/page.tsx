'use client';

import { useState } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Button } from 'app/_components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

import { ChannelType, generateLobbyName } from '@ei/lobby';
import { useLobby } from '@ei/react-shared/context/lobby';

import NameInput from './NameInput';

const lobbyTypeEmoji = {
  [ChannelType.Public]: '🔊',
  [ChannelType.Mute]: '🙊',
  [ChannelType.Nojoin]: '🔒',
};

function LobbyScreen() {
  const { lobby, changeChannelType, changeUserLimit, changeName } = useLobby();
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

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

  const nameInfo = generateLobbyName(
    lobby.channel.type,
    {
      displayName: lobby.user.displayName,
    },
    lobby.channel.name,
  );

  const limits = new Set([0, 2, 5, 10, lobby.channel.limit || 0]);

  return (
    <div className="flex flex-1 justify-center">
      <div className="container flex items-center justify-center">
        {lobby && (
          <div className="flex w-full max-w-md flex-col gap-3 p-4">
            <div className="flex flex-row items-center justify-center gap-4">
              <div>
                {lobby.guild.icon ? (
                  <img
                    src={lobby.guild.icon}
                    className="h-20 w-20 rounded-full bg-primary-900"
                    alt=""
                  />
                ) : (
                  <div className="bg-secondary h-24 w-24 rounded-full" />
                )}
              </div>
              <div className="text-4xl font-bold">{lobby.guild.name}</div>
            </div>
            <div className="flex h-16 rounded-full bg-primary-900 p-2 text-center text-2xl font-bold">
              <div className="relative z-10 aspect-square h-full">
                <Button
                  variant="secondary"
                  className="relative aspect-square h-full overflow-hidden rounded-full text-2xl"
                  onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                >
                  <AnimatePresence initial={false}>
                    <motion.span
                      key={nameInfo?.icon}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ y: -50, opacity: 1 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 50, opacity: 1 }}
                    >
                      {nameInfo?.icon}
                    </motion.span>
                  </AnimatePresence>
                </Button>
                {emojiPickerOpen && (
                  <Picker
                    className="top-2"
                    data={data}
                    onEmojiSelect={(emoji: unknown) => {
                      if (
                        emoji &&
                        typeof emoji === 'object' &&
                        'native' in emoji
                      ) {
                        changeName(`${emoji.native} ${nameInfo?.name || ''}`);
                      }
                    }}
                    noCountryFlags
                  />
                )}
              </div>
              <NameInput
                currentName={nameInfo?.name || null}
                onNameChange={(name) => changeName(name)}
              />
            </div>
            <div className="flex h-16 justify-center gap-8 rounded-full bg-primary-900 p-2 text-center text-2xl font-bold">
              {[ChannelType.Public, ChannelType.Mute, ChannelType.Nojoin].map(
                (type) => (
                  <Button
                    key={type}
                    variant="ghost"
                    className="relative aspect-square h-full rounded-full text-2xl hover:bg-primary-800/20"
                    onClick={() => changeChannelType(type)}
                  >
                    {lobby.channel.type === type && (
                      <motion.div
                        layoutId="type-selected"
                        className="absolute inset-0 rounded-full bg-primary-800"
                      />
                    )}
                    <span className="absolute inset-0 z-0 flex items-center justify-center">
                      {lobbyTypeEmoji[type]}
                    </span>
                  </Button>
                ),
              )}
            </div>
            <div className="flex h-16 justify-center gap-8 rounded-full bg-primary-900 p-2 text-center text-2xl font-bold">
              {Array.from(limits)
                .sort((a, b) => a - b)
                .map((limit) => (
                  <Button
                    key={limit}
                    variant="ghost"
                    className="relative aspect-square h-full rounded-full text-2xl hover:bg-primary-800/20"
                    onClick={() => changeUserLimit(limit)}
                  >
                    {lobby.channel.limit === limit && (
                      <motion.div
                        layoutId="user-limit-selected"
                        className="absolute inset-0 rounded-full bg-primary-800"
                      />
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
