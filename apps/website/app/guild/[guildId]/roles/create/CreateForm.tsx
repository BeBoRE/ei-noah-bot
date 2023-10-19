'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { Input } from 'app/_components/ui/input';
import { Label } from 'app/_components/ui/label';
import { Plus } from 'lucide-react';
import { api } from 'utils/api';

const maxLength = 99;

type Props = {
  guildId: string;
};

function CreateForm({ guildId }: Props) {
  const [name, setName] = useState<string | null>(null);
  const router = useRouter();

  const changeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.trimStart().toLowerCase());
  };

  const { mutate: createRole } = api.roles.createRole.useMutation({
    onSuccess: () => {
      router.push(`.`);
    },
  });

  const submit = () => {
    if (!name) return;

    createRole({ guildId, name });
    console.log(name);
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
        onClick={submit}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create
      </Button>
    </>
  );
}

export default CreateForm;
