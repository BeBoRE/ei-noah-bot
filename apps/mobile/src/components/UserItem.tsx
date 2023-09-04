import { Alert, Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  Layout,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePusher } from 'src/context/pusher';
import { api } from 'src/utils/api';

import { ChannelType, userIdToPusherChannel, type userSchema } from '@ei/lobby';
import baseConfig from '@ei/tailwind-config';

import Text from './Text';

type ButtonProps = {
  onPress: () => void;
};

function AcceptButton({ onPress }: ButtonProps) {
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut.duration(200)}>
      <Pressable
        onPress={onPress}
        className="h-16 w-16 items-center justify-center rounded-full bg-accept"
      >
        <MaterialCommunityIcons
          name="check"
          size={48}
          color={baseConfig.theme.colors.text}
        />
      </Pressable>
    </Animated.View>
  );
}

function RejectButton({
  onPress,
  userName,
}: ButtonProps & { userName: string }) {
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut.duration(200)}>
      <Pressable
        onPress={() =>
          Alert.alert(
            `Removing ${userName} from lobby`,
            `Are you sure you want to remove ${userName} from your lobby`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', onPress },
            ],
          )
        }
        style={{ transform: [{ scaleX: -1 }, { rotate: '30deg' }] }}
        className="h-16 w-16 items-center justify-center rounded-full bg-reject"
      >
        <MaterialCommunityIcons
          name="shoe-cleat"
          size={42}
          color={baseConfig.theme.colors.text}
        />
      </Pressable>
    </Animated.View>
  );
}

function UserItem({
  user,
  channelType,
}: {
  user: Zod.infer<typeof userSchema>;
  channelType: ChannelType;
}) {
  const { pusher } = usePusher();
  const { data: me } = api.user.me.useQuery();

  const showButtons = channelType !== ChannelType.Public;

  const onReject = () => {
    if (!pusher || !me) return;

    pusher
      .channel(userIdToPusherChannel(me))
      .trigger('client-remove-user', { user: { id: user.id } });
  };

  const onAccept = () => {
    if (!pusher || !me) return;

    pusher
      .channel(userIdToPusherChannel(me))
      .trigger('client-add-user', { user: { id: user.id } });
  };

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutDown}
      layout={Layout.duration(200).delay(100)}
      className="mb-3 flex-row justify-between rounded-full bg-primary-800 p-3"
    >
      <View className="flex-row items-center">
        {user.avatar ? (
          <Image
            source={user.avatar}
            alt=""
            className="mr-3 h-16 w-16 rounded-full bg-primary-900"
          />
        ) : (
          <View className="mr-3 h-16 w-16 rounded-full bg-primary-900" />
        )}
        <Text className="text-2xl">{user.username}</Text>
      </View>

      {showButtons &&
        (user.isAllowed ? (
          <RejectButton userName={user.username} onPress={onReject} />
        ) : (
          <AcceptButton onPress={onAccept} />
        ))}
    </Animated.View>
  );
}

export default UserItem;
