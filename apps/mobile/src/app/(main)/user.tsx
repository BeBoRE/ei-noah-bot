import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { toast } from 'burnt';
import { View } from 'moti';
import type { SFSymbol } from 'sf-symbols-typescript';
import { Button } from 'src/components/ui/button';
import { Text } from 'src/components/ui/text';
import { useAuth } from 'src/context/auth';
import { getUserImageUrl } from 'src/utils/cdn';
import { twMerge } from 'tailwind-merge';

import { api } from '@ei/react-shared';
import baseConfig from '@ei/tailwind-config';

function Divider({ className, ...props }: { className?: string }) {
  const mergedName = twMerge('h-1 bg-primary-900 rounded-full', className);

  // eslint-disable-next-line react/jsx-props-no-spreading
  return <View className={mergedName} {...props} />;
}

function UserScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const utils = api.useUtils();

  const { mutate: logout, isPending: isLoggingOut } =
    api.user.logout.useMutation({
      onSuccess: () => {
        signOut();

        utils.invalidate(undefined);
      },
      onError: (err) => {
        toast({
          title: 'Failed to log out',
          message: err.message,
          preset: 'custom',
          icon: {
            ios: {
              name: 'exclamationmark.triangle' satisfies SFSymbol,
              color: baseConfig.theme.colors.primary.DEFAULT,
            },
          },
          haptic: 'error',
        });
      },
    });

  const { data: user } = api.user.me.useQuery();

  return (
    <>
      <Stack.Screen options={{ headerTitle: '' }} />
      <ScrollView
        className="flex-1 px-4"
        style={{
          paddingTop: insets.top + 20,
        }}
      >
        <View className="flex-row items-center justify-center rounded-full">
          {user && (
            <Image
              source={getUserImageUrl(user)}
              className="mr-2 h-16 w-16 rounded-full"
            />
          )}
          <Text className="flex-1 text-3xl font-bold">
            {user?.globalName || user?.username || 'Loading...'}
          </Text>
        </View>
        <Divider className="my-4" />
        <Button
          variant="destructive"
          onPress={() => logout()}
          disabled={isLoggingOut}
        >
          <Text>Log out</Text>
        </Button>
      </ScrollView>
    </>
  );
}

export default UserScreen;
