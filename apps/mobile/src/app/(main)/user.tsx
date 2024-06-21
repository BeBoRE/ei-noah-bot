import { Suspense } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { toast } from 'burnt';
import { Cake } from 'lucide-react-native';
import { View } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { cssInterop } from 'nativewind';
import type { SFSymbol } from 'sf-symbols-typescript';
import { Button } from 'src/components/ui/button';
import { Text } from 'src/components/ui/text';
import { useAuth } from 'src/context/auth';
import { getUserImageUrl } from 'src/utils/cdn';
import { twMerge } from 'tailwind-merge';

import { api } from '@ei/react-shared';
import baseConfig from '@ei/tailwind-config';

cssInterop(Cake, { className: 'style' });

function Divider({ className, ...props }: { className?: string }) {
  const mergedName = twMerge('h-1 bg-primary-900 rounded-full', className);

  // eslint-disable-next-line react/jsx-props-no-spreading
  return <View className={mergedName} {...props} />;
}

function UserInfo() {
  const [user] = api.user.me.useSuspenseQuery();
  const [birthdate] = api.birthday.me.useSuspenseQuery();

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const birthdayFormatted = birthdate ? formatter.format(birthdate) : null;

  return (
    <>
      <View className="flex-row items-center rounded-full">
        {user && (
          <Image
            source={getUserImageUrl(user)}
            className="mr-2 h-16 w-16 rounded-full"
          />
        )}
        <Text className="flex-1 text-3xl font-bold">
          {user.globalName || user.username}
        </Text>
      </View>
      {birthdayFormatted && (
        <View className="mt-2 flex-row items-center">
          <Cake className="mr-2 text-primary-600" size={18} />
          <Text className="text-center text-lg text-primary-600">
            {birthdayFormatted}
          </Text>
        </View>
      )}
    </>
  );
}

function UserInfoSkeleton() {
  return (
    <View className="flex-row items-center rounded-full">
      <Skeleton radius="round" width={64} height={64} />
      <View className="w-8/12 pl-2">
        <Skeleton width="100%" height={24} />
      </View>
    </View>
  );
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

  return (
    <>
      <Stack.Screen options={{ headerTitle: '' }} />
      <ScrollView
        className="flex-1 px-4"
        style={{
          paddingTop: insets.top + 20,
        }}
      >
        <Suspense fallback={<UserInfoSkeleton />}>
          <UserInfo />
        </Suspense>
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
