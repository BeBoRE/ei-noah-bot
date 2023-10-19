'use client';

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
      <Select value={currentSelectedRoleMenuChannel?.id || undefined}>
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
              <>
                {index !== 0 && <SelectSeparator />}
                <SelectGroup key={parentId}>
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
              </>
            ))}
        </SelectContent>
      </Select>
    </>
  );
}

export default Settings;
