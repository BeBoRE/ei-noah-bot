import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import Button from 'src/components/Button';
import Text from 'src/components/Text';
import {ResponseType, exchangeCodeAsync, makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import { useMemo } from 'react';
import { useAuth } from 'src/context/auth';

const SignIn = () => {
  const redirectUri = useMemo(() => makeRedirectUri({
    native: 'ei://auth',
  }), []);

  const {signIn} = useAuth();

  const discovery = {
    authorizationEndpoint: 'https://discord.com/oauth2/authorize',
    tokenEndpoint: 'https://discord.com/api/oauth2/token',
    revocationEndpoint: 'https://discord.com/api/oauth2/token/revoke',
  };

  const [request, , promptAsync] = useAuthRequest({
      clientId: process.env.EXPO_PUBLIC_CLIENT_ID || '',
      scopes: ['identify'],
      responseType: ResponseType.Code,
      usePKCE: true,
      redirectUri
    }, 
    discovery
  );

  const prompt = () => promptAsync().then((res) => {
    if (res.type === 'success' && res.params.code) {

      exchangeCodeAsync({
        clientId: process.env.EXPO_PUBLIC_CLIENT_ID || '',
        code: res.params.code,
        extraParams: request?.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
        redirectUri: redirectUri,
      }, discovery)
        .then((res) => signIn({accessToken: res.accessToken, refreshToken: res.refreshToken, expiresAt: res.expiresIn, scope: res.scope || ''}))
    }
  })

  return (
    <>
      <Stack.Screen options={{headerTitle: ""}} />
      <View className='flex-1 justify-center p-10'>
        <Image source={require('assets/ei.png')} contentFit='contain' className='w-full h-64 mb-2 gray' alt='' />
        <View>
          <Text className='text-3xl text-center mb-3'>
            Sign Into Discord
          </Text>
          <Button disabled={!request} onPress={() => prompt()} className='bg-[#5865F2] opacity-100 active:opacity-80 disabled:opacity-50 transition-opacity justify-center items-center flex-row'>
            <Image source={require('assets/discord-mark-white.svg')} contentFit='contain' className='w-8 h-8 mr-2' alt='' />
            <Text className='text-center text-white font-bold text-lg'>Sign In</Text>
          </Button>
        </View>
      </View>
    </>
  )
}

export default SignIn;
