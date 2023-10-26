'use client';

import { useEffect, useState } from 'react';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en.json';
import ReactTimeAgo from 'react-time-ago';

TimeAgo.addDefaultLocale(en);

type Props = {
  currentName: string | null;
  onNameChange: (name: string) => void;
  nameChangeDate: number | null | undefined;
};

function NameInput({ currentName, onNameChange, nameChangeDate }: Props) {
  const [name, setName] = useState<string | null>(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  return (
    <form
      className="relative flex flex-1 flex-col items-center justify-center"
      onSubmit={(e) => {
        e.preventDefault();
        if (name) onNameChange(name);
      }}
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
