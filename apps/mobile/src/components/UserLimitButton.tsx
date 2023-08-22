import { usePusher } from 'src/context/pusher';
import { api } from 'src/utils/api';

import {
  clientChangeLobby,
  lobbyChangeSchema,
  userIdToPusherChannel,
} from '@ei/lobby';

import Options from './Options';
import Text from './Text';

type Props = {
  limit: number;
  lobby: NonNullable<Zod.infer<typeof lobbyChangeSchema>>['channel'];
};

function UserLimitButton({ limit, lobby }: Props) {
  const pusher = usePusher();
  const { data: user } = api.user.me.useQuery();

  const onPress = () => {
    if (!pusher) return;
    if (!user) return;

    const channel = pusher.channel(userIdToPusherChannel(user));

    channel.trigger('client-change-lobby', { limit } satisfies Zod.infer<
      typeof clientChangeLobby
    >);
  };

  const isActive = lobby.limit === limit;

  return (
    <Options.Item onPress={onPress} disabled={isActive} active={isActive}>
      <Text className="text-3xl font-bold">{limit === 0 ? '∞' : limit}</Text>
    </Options.Item>
  );
}

export default UserLimitButton;
