'use client';

import { useState } from 'react';
import { Button } from 'app/_components/ui/button';
import { Input } from 'app/_components/ui/input';
import { Label } from 'app/_components/ui/label';
import { Plus } from 'lucide-react';

const maxLength = 99;

function CreateForm() {
  const [name, setName] = useState<string | null>(null);

  const changeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.trimStart().replace(' ', '-').toLowerCase());
  };

  return (
    <>
      <Label className="pb-1" htmlFor="name">
        Role name:
      </Label>
      <Input
        id="name"
        value={name || ''}
        type="text"
        placeholder="Name"
        maxLength={maxLength}
        onChange={changeName}
      />
      <Button
        disabled={!name}
        type="submit"
        className="mt-2 w-auto justify-start self-end"
        variant="outline"
      >
        <Plus className="mr-2 h-4 w-4" />
        Create
      </Button>
    </>
  );
}

export default CreateForm;
