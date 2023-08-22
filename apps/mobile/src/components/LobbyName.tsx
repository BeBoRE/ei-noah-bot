import { forwardRef, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import EmojiPicker, { emojisByCategory } from 'rn-emoji-keyboard';
import { usePusher } from 'src/context/pusher';

import {
  generateLobbyName,
  lobbyChangeSchema,
  lobbyNameSchema,
  userIdToPusherChannel,
} from '@ei/lobby';
import baseConfig from '@ei/tailwind-config';

import Text from './Text';

type Props = {
  lobby: NonNullable<Zod.infer<typeof lobbyChangeSchema>>;
};

const LobbyName = forwardRef<View, Props>(({ lobby }: Props, ref) => {
  const nameInfo = generateLobbyName(
    lobby.channel.type,
    lobby.user,
    lobby.channel.name,
  );

  const pusher = usePusher();

  const [emojiOpen, setEmojiOpen] = useState(false);

  const emojiMap = useMemo(
    () =>
      emojisByCategory.flatMap((category) =>
        category.data.map((emoji) => emoji),
      ),
    [],
  );

  const [name, setName] = useState(nameInfo?.name);

  const onNameChange = (newName: string) => {
    pusher?.send_event(
      'client-change-name',
      {
        name: newName,
      } satisfies Zod.infer<typeof lobbyNameSchema>,
      userIdToPusherChannel(lobby.user),
    );
  };

  return (
    <View
      ref={ref}
      className="mb-3 flex flex-row items-center rounded-full bg-primary-900 p-2"
    >
      <Pressable
        onPress={() => setEmojiOpen(true)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-800"
      >
        <Text className="text-4xl">{nameInfo?.icon}</Text>
      </Pressable>
      <View className="flex-1">
        <TextInput
          value={name}
          className="p-3 text-center text-3xl font-bold text-primary-100"
          onChangeText={(text) => {
            setName(text);
          }}
          autoComplete="off"
          onSubmitEditing={() => {
            const newName = generateLobbyName(
              lobby.channel.type,
              lobby.user,
              `${nameInfo?.icon} ${name}`,
              false,
            )?.full;

            console.log(newName);

            if (newName) {
              onNameChange(newName);
            } else {
              setName(nameInfo?.name);
            }
          }}
        />
      </View>
      <EmojiPicker
        open={emojiOpen}
        onClose={() => {
          setEmojiOpen(false);
        }}
        onEmojiSelected={(e) => {
          const newName = generateLobbyName(
            lobby.channel.type,
            lobby.user,
            `${e.emoji} ${nameInfo?.name}`,
            false,
          )?.full;

          if (newName) {
            onNameChange(newName);
          }
        }}
        categoryPosition="top"
        theme={{
          knob: baseConfig.theme.colors.primary[500],
          container: baseConfig.theme.colors.primary[900],
          header: baseConfig.theme.colors.primary[200],
          skinTonesContainer: baseConfig.theme.colors.primary[800],
          category: {
            icon: baseConfig.theme.colors.primary[500],
            iconActive: baseConfig.theme.colors.primary[400],
            container: baseConfig.theme.colors.primary[900],
            containerActive: baseConfig.theme.colors.primary[800],
          },
          emoji: {
            selected: baseConfig.theme.colors.primary[800],
          },
        }}
        expandable={false}
        disabledCategories={['flags']}
        selectedEmojis={
          nameInfo?.icon
            ? emojiMap
                .filter((e) => e.emoji === nameInfo.icon)
                .map((e) => e.name)
            : []
        }
      />
    </View>
  );
});

export const AnimatedLobbyName = Animated.createAnimatedComponent(LobbyName);

export default LobbyName;
