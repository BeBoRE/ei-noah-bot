'use client';

import { useEffect, useState } from 'react';

type Props = {
  currentName: string | null;
  onNameChange: (name: string) => void;
};

function NameInput({ currentName, onNameChange }: Props) {
  const [name, setName] = useState<string | null>(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  return (
    <form
      className="flex items-center justify-center"
      onSubmit={(e) => {
        e.preventDefault();
        if (name) onNameChange(name);
      }}
    >
      <input
        className="rounded-full bg-[#0000] text-center"
        type="text"
        value={name || undefined}
        onChange={(e) => setName(e.target.value)}
      />
    </form>
  );
}

export default NameInput;
