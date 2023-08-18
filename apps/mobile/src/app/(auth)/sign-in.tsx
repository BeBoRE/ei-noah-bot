import { View } from 'react-native';
import { exchangeCodeAsync, useAuthRequest } from 'expo-auth-session';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import Button from 'src/components/Button';
import Text from 'src/components/Text';
import config from 'src/config';
import { useAuth } from 'src/context/auth';
import { authConfig, discovery, expiresAt, redirectUri } from 'src/utils/auth';

function SignIn() {
  const { signIn } = useAuth();

  const [request, , promptAsync] = useAuthRequest(authConfig, discovery);

  const prompt = () =>
    promptAsync().then((res) => {
      if (res.type === 'success' && res.params.code) {
        exchangeCodeAsync(
          {
            clientId: config.discord.clientId,
            code: res.params.code,
            extraParams: request?.codeVerifier
              ? { code_verifier: request.codeVerifier }
              : undefined,
            redirectUri,
          },
          discovery,
        ).then((exchangeRes) =>
          signIn({
            accessToken: exchangeRes.accessToken,
            refreshToken: exchangeRes.refreshToken,
            expiresAt:
              exchangeRes.expiresIn && expiresAt(exchangeRes.expiresIn),
            scope: exchangeRes.scope || '',
          }),
        );
      }
    });

  return (
    <>
      <Stack.Screen
        options={{ headerTitle: '', animation: 'slide_from_bottom' }}
      />
      <View className="flex-1 justify-center p-10">
        <Image
          source={require('assets/ei.png')}
          contentFit="contain"
          className="gray mb-2 h-64 w-full"
          alt=""
        />
        <View>
          <Text className="mb-3 text-center text-3xl">Sign Into Discord</Text>
          <Button
            disabled={!request}
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
      </View>
    </>
  );
}

export default SignIn;
