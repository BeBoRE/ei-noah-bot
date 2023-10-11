import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import ReactTimeAgo from 'react-time-ago';
import EmojiPicker, { emojisByCategory } from 'rn-emoji-keyboard';
import { api } from 'src/utils/api';

import { generateLobbyName, LobbyChange } from '@ei/lobby';
import baseConfig from '@ei/tailwind-config';

import Text, { AnimatedText } from './Text';

type Props = {
  lobby: NonNullable<LobbyChange>;
};

const LobbyName = forwardRef<View, Props>(({ lobby }: Props, ref) => {
  const { mutate: changeLobby } = api.lobby.changeLobby.useMutation();

  const nameInfo = generateLobbyName(
    lobby.channel.type,
    lobby.user,
    lobby.channel.name,
  );

  const [emojiOpen, setEmojiOpen] = useState(false);

  const emojiMap = useMemo(
    () =>
      emojisByCategory.flatMap((category) =>
        category.data.map((emoji) => emoji),
      ),
    [],
  );

  const [name, setName] = useState(nameInfo?.name);

  useEffect(() => {
    setName(nameInfo?.name);
  }, [nameInfo?.name]);

  const onNameChange = (newName: string) => {
    changeLobby({
      name: newName,
    });
  };

  return (
    <View
      ref={ref}
      className="flex flex-row items-center rounded-full bg-primary-900 p-2"
    >
      <Pressable
        onPress={() => setEmojiOpen(true)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-800"
      >
        <AnimatedText
          key={nameInfo?.icon}
          entering={FadeInDown.duration(200)}
          exiting={FadeOutUp.duration(200)}
          className="text-4xl"
        >
          {nameInfo?.icon}
        </AnimatedText>
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
        {lobby.channel.lobbyNameChangeDate && (
          <Text className="absolute bottom-0 w-full text-center text-xs">
            Changes{' '}
            <ReactTimeAgo
              timeStyle="round"
              component={Text}
              date={lobby.channel.lobbyNameChangeDate}
            />
          </Text>
        )}
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
          search: {
            background: baseConfig.theme.colors.primary[800],
            placeholder: baseConfig.theme.colors.primary[400],
            icon: baseConfig.theme.colors.primary[400],
            text: baseConfig.theme.colors.primary[400],
          },
        }}
        styles={{
          searchBar: {
            container: {
              marginBottom: 20,
            },
          },
        }}
        enableSearchBar
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
