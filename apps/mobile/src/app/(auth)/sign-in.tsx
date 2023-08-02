import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import Button from 'src/components/Button';
import Text from 'src/components/Text';
import {ResponseType, makeRedirectUri, useAuthRequest} from 'expo-auth-session';

const SignIn = () => {
  const redirectUri = makeRedirectUri({
    scheme: 'ei',
  });

  console.log(redirectUri)
  console.log(process.env.EXPO_PUBLIC_CLIENT_ID)

  const [request, , promptAsync] = useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_CLIENT_ID || '',
    scopes: ['identify'],
    responseType: ResponseType.Token,
    redirectUri: makeRedirectUri({
      scheme: 'ei',
    })}, {
      authorizationEndpoint: 'https://discord.com/api/oauth2/authorize',
      tokenEndpoint: 'https://discord.com/api/oauth2/token',
      revocationEndpoint: 'https://discord.com/api/oauth2/token/revoke',
    });

  return (
    <>
      <Stack.Screen options={{headerTitle: ""}} />
      <View className='flex-1 justify-center p-10'>
        <Image source={require('assets/ei.png')} contentFit='contain' className='w-full h-64 mb-2 gray' alt='' />
        <View>
          <Text className='text-3xl text-center mb-3'>
            Sign Into Discord
          </Text>
          <Button disabled={!request} onPress={() => promptAsync()} className='bg-[#5865F2] opacity-100 active:opacity-80 disabled:opacity-50 transition-opacity justify-center items-center flex-row'>
            <Image source={require('assets/discord-mark-white.svg')} contentFit='contain' className='w-8 h-8 mr-2' alt='' />
            <Text className='text-center text-white font-bold text-lg'>Sign In</Text>
          </Button>
        </View>
      </View>
    </>
  )
}

export default SignIn;
