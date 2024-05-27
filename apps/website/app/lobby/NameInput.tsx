'use client';

import { useEffect, useState } from 'react';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en.json';
import ReactTimeAgo from 'react-time-ago';

import { generateLobbyName, LobbyNameInfo } from '@ei/lobby';

TimeAgo.addDefaultLocale(en);

type Props = {
  channelType: Parameters<typeof generateLobbyName>[0];
  owner: Parameters<typeof generateLobbyName>[1];
  currentName: LobbyNameInfo | null;
  onNameChange: (nameInfo: LobbyNameInfo) => void;
  nameChangeDate: Date | null | undefined;
};

function NameInput({
  currentName,
  onNameChange,
  nameChangeDate,
  channelType,
  owner,
}: Props) {
  const [name, setName] = useState<string | null>(currentName?.name || null);

  useEffect(() => {
    setName(currentName?.name || null);
  }, [currentName]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newName = generateLobbyName(
      channelType,
      owner,
      `${currentName?.icon} ${name}`,
    );

    if (newName) {
      onNameChange(newName);
    } else {
      setName(currentName?.name || null);
    }
  };

  return (
    <form
      className="relative flex flex-1 flex-col items-center justify-center"
      onSubmit={onSubmit}
    >
      <input
        className="w-64 rounded-full bg-[#0000] text-center sm:w-72"
        type="text"
        value={name || undefined}
        onChange={(e) => setName(e.target.value)}
      />
      <p className="absolute -bottom-1.5 text-xs dark:text-primary-500">
        {nameChangeDate && (
          <>
            Changes <ReactTimeAgo date={nameChangeDate} timeStyle="round" />
          </>
        )}
      </p>
    </form>
  );
}

export default NameInput;
