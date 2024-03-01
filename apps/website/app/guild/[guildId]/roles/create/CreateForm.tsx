'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { Input } from 'app/_components/ui/input';
import { Label } from 'app/_components/ui/label';
import { Plus } from 'lucide-react';

import { useCreateRole } from '@ei/react-shared/roles';

const maxLength = 99;

type Props = {
  guildId: string;
};

function CreateForm({ guildId }: Props) {
  const [name, setName] = useState<string | null>(null);
  const router = useRouter();

  const changeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.trimStart());
  };

  const { createRole, error, isPending } = useCreateRole(guildId, name, () => {
    router.push(`/guild/${guildId}/roles`);
  });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createRole();
  };

  return (
    <form onSubmit={submit} className="flex flex-col">
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
      <div className="mt-2 flex items-center justify-between">
        <p className="text-reject">{error?.message}</p>
        <Button disabled={!name || isPending} type="submit" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Create
        </Button>
      </div>
    </form>
  );
}

export default CreateForm;
