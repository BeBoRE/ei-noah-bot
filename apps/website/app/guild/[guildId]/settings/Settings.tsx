'use client';

import React from 'react';
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
import { api, RouterOutputs } from 'utils/api';

type Props = {
  guildId: string;
  guildData: RouterOutputs['guild']['get'];
  channelData: RouterOutputs['channel']['all'];
};

function Settings({ guildData, guildId, channelData }: Props) {
  const { data: guild } = api.guild.get.useQuery(
    { guildId },
    { initialData: guildData },
  );
  const { data: channels } = api.channel.all.useQuery(
    { guildId },
    { initialData: channelData },
  );

  const context = api.useContext();

  const { mutate: setRoleMenuChannel } =
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
    <>
      <h3 className="pl-3">Channel for role menu</h3>
      <Select
        value={currentSelectedRoleMenuChannel?.id || undefined}
        onValueChange={(value) => {
          setRoleMenuChannel({ guildId, channelId: value });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a channel" />
        </SelectTrigger>
        <SelectContent>
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
    </>
  );
}

export default Settings;
