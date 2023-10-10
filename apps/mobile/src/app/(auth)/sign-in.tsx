import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Button from 'src/components/Button';
import Text from 'src/components/Text';
import { useAuth } from 'src/context/auth';
import {openAuthSessionAsync} from 'expo-web-browser'
import { parse } from 'expo-linking';
import { getBaseUrl } from 'src/utils/api';

function SignIn() {
  const { signIn } = useAuth();

  const insets = useSafeAreaInsets();

  const prompt = async () => {
    const result = await openAuthSessionAsync(
      `${getBaseUrl()}/login/discord?platform=mobile`,
      'ei://auth'
    )

    if (result.type !== 'success') {
      console.log(result);
      return;
    };

    const url = parse(result.url);

    const sessionToken = url?.queryParams?.session_token?.toString() ?? null;

    if (!sessionToken) {
      console.log('No session token found');
      return;
    };

    signIn(sessionToken);
  }

  return (
    <>
      <Stack.Screen
        options={{ headerTitle: '', animation: 'slide_from_bottom' }}
      />
      <View
        className="flex-1 justify-center p-10"
        style={{ paddingBottom: insets.bottom }}
      >
        <Image
          source={require('assets/ei.png')}
          contentFit="contain"
          className="gray mb-2 h-64 w-full"
          alt=""
        />
        <View>
          <Text className="mb-3 text-center text-3xl">Sign Into Discord</Text>
          <Button
            onPress={() => prompt()}
            className="flex-row items-center justify-center bg-[#5865F2] opacity-100 transition-opacity active:opacity-80 disabled:opacity-50"
          >
            <Image
              source={require('assets/discord-mark-white.svg')}
              contentFit="contain"
              className="mr-2 h-8 w-8"
              alt=""
            />
            <Text className="text-white text-center text-lg font-bold">
              Sign In
            </Text>
          </Button>
        </View>
        <StatusBar style="dark" />
      </View>
    </>
  );
}

export default SignIn;
