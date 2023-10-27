'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { Input } from 'app/_components/ui/input';
import { Label } from 'app/_components/ui/label';
import { Plus } from 'lucide-react';

import { api } from '@ei/react-shared';

const maxLength = 99;

type Props = {
  guildId: string;
};

function CreateForm({ guildId }: Props) {
  const [name, setName] = useState<string | null>(null);
  const router = useRouter();

  const context = api.useContext();

  const [me] = api.user.me.useSuspenseQuery();

  const changeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.trimStart());
  };

  const { mutate: createRole, error } = api.roles.createRole.useMutation({
    onMutate: async () => {
      await context.roles.guildCustom.cancel({ guildId });
      await context.guild.get.cancel({ guildId });
    },
    onSuccess: async ({ dbRole, discordRole, notApprovedRole }) => {
      const promises = [];
      
      if (notApprovedRole) {
        context.roles.guildNotApproved.setData({ guildId }, (prev) => [
          ...(prev || []),
          {...notApprovedRole, createdByUserId: me?.id || ''},
        ]);

        promises.push(context.roles.guildNotApproved.invalidate({ guildId }));
      }

      if (dbRole) {
        context.roles.guildCustom.setData({ guildId }, (prev) => [
          ...(prev || []),
          dbRole,
        ]);

        promises.push(context.roles.guildCustom.invalidate({ guildId }));
      }

      if (discordRole) {
        context.guild.get.setData({ guildId }, (prev) => {
          if (!prev) return prev;
  
          const guild = { ...prev };
          guild.discord.roles = [...guild.discord.roles, discordRole];
  
          return guild;
        });

        promises.push(await context.guild.get.invalidate({ guildId }));
      }

      await Promise.all(promises);

      router.push(`.`);
    },
  });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name) return;

    createRole({ guildId, name });
    console.log(name);
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
        <Button disabled={!name} type="submit" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Create
        </Button>
      </div>
    </form>
  );
}

export default CreateForm;
