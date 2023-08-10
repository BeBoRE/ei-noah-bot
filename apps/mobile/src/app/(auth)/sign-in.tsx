import { useMemo } from 'react';
import { View } from 'react-native';
import {
  exchangeCodeAsync,
  makeRedirectUri,
  ResponseType,
  useAuthRequest,
} from 'expo-auth-session';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import Button from 'src/components/Button';
import Text from 'src/components/Text';
import config from 'src/config';
import { useAuth } from 'src/context/auth';

function SignIn() {
  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        native: 'ei://auth',
      }),
    [],
  );

  const { signIn } = useAuth();

  const discovery = {
    authorizationEndpoint: 'https://discord.com/oauth2/authorize',
    tokenEndpoint: 'https://discord.com/api/oauth2/token',
    revocationEndpoint: 'https://discord.com/api/oauth2/token/revoke',
  };

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: config.discord.clientId,
      scopes: ['identify'],
      responseType: ResponseType.Code,
      usePKCE: true,
      redirectUri,
    },
    discovery,
  );

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
            expiresAt: exchangeRes.expiresIn,
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
