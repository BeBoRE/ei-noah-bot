'use client';

import React from 'react';
import { Button } from 'app/_components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from 'app/_components/ui/select';
import { RouterOutputs } from '@ei/trpc';
import { api } from '@ei/react-shared';

type Props = {
  guildId: string;
  guildData: RouterOutputs['guild']['get'];
  channelData: RouterOutputs['channel']['all'];
};

function RoleChannelSelect({ guildData, guildId, channelData }: Props) {
  const { data: guild } = api.guild.get.useQuery(
    { guildId },
    { initialData: guildData },
  );
  const { data: channels } = api.channel.all.useQuery(
    { guildId },
    { initialData: channelData },
  );

  const context = api.useContext();

  const { mutate: setRoleMenuChannel, isLoading } =
    api.guild.setRoleMenuChannel.useMutation({
      onMutate: async ({ channelId }) => {
        await context.guild.get.cancel({ guildId });

        const prevGuild = context.guild.get.getData({ guildId });
        const newGuild = prevGuild && {
          ...prevGuild,
          db: {
            ...prevGuild.db,
            roleMenuChannelId: channelId,
          },
        };

        context.guild.get.setData({ guildId }, newGuild);

        return { prevGuild };
      },
      onError(_1, _2, prev) {
        context.guild.get.setData({ guildId }, prev && prev.prevGuild);
      },
      onSettled: () => {
        context.guild.get.invalidate({ guildId });
      },
    });

  const textChannels = channels?.filter((channel) => channel.type === 0);

  const currentSelectedRoleMenuChannel = textChannels?.find(
    (channel) => channel.id === guild?.db.roleMenuChannelId,
  );

  const channelsGrouped = new Map<string | null, typeof textChannels>();

  textChannels?.forEach((channel) => {
    const category = channelsGrouped.get(channel.parentId);

    if (category) {
      category.push(channel);
    } else {
      channelsGrouped.set(channel.parentId, [channel]);
    }
  });

  return (
    <div className="pb-2">
      <h3 className="pl-3">Channel for role menu</h3>
      <div className="flex gap-2">
        <Select
          disabled={isLoading}
          value={currentSelectedRoleMenuChannel?.id || undefined}
          onValueChange={(value) => {
            setRoleMenuChannel({ guildId, channelId: value });
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a channel" />
          </SelectTrigger>
          <SelectContent className="max-h-80 overflow-auto">
            {Array.from(channelsGrouped.entries())
              .sort(([parentIdA], [parentIdB]) => {
                const categoryA = channels.find(
                  (channel) => channel.id === parentIdA,
                );
                const categoryB = channels.find(
                  (channel) => channel.id === parentIdB,
                );

                if (!categoryA || !categoryB) {
                  return 0;
                }

                return categoryA.position - categoryB.position;
              })
              .map(([parentId, channelList], index) => (
                <React.Fragment key={parentId}>
                  {index !== 0 && <SelectSeparator />}
                  <SelectGroup>
                    {parentId && (
                      <SelectLabel>
                        {channels.find((channel) => channel.id === parentId)
                          ?.name || 'Invalid Category'}
                      </SelectLabel>
                    )}
                    {channelList
                      .sort(
                        (channelA, channelB) =>
                          channelA.position - channelB.position,
                      )
                      .map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </React.Fragment>
              ))}
          </SelectContent>
        </Select>
        <Button
          disabled={isLoading}
          variant="outline"
          onClick={() => setRoleMenuChannel({ guildId, channelId: null })}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

export default RoleChannelSelect;
