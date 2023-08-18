import {
  AuthRequestConfig,
  DiscoveryDocument,
  makeRedirectUri,
  refreshAsync,
  ResponseType,
} from 'expo-auth-session';
import config from 'src/config';

import { secureStorage, SecureStoreOutput } from './storage/secureStorage';

export const discovery: DiscoveryDocument = {
  authorizationEndpoint: 'https://discord.com/oauth2/authorize',
  tokenEndpoint: 'https://discord.com/api/oauth2/token',
  revocationEndpoint: 'https://discord.com/api/oauth2/token/revoke',
};

export const redirectUri = makeRedirectUri({
  native: 'ei://auth',
});

export const authConfig: AuthRequestConfig = {
  clientId: config.discord.clientId,
  scopes: ['identify'],
  responseType: ResponseType.Code,
  usePKCE: true,
  redirectUri,
};

export const expiresAt = (expiresIn: number) =>
  new Date(Date.now() + expiresIn * 1000);

// Refreshes the token if it's expired
export const refreshToken = async (
  loginInfo: SecureStoreOutput<'discordOauth'> | null,
) => {
  console.log('Checking if token is expired');
  if (
    loginInfo &&
    loginInfo.expiresAt &&
    loginInfo.expiresAt?.getTime() > Date.now()
  ) {
    // Print the time left until the token expires devided into either days, hours, minutes or seconds
    const timeLeft = loginInfo.expiresAt.getTime() - Date.now();
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(timeLeft / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(timeLeft / (1000 * 60)) % 60;
    const seconds = Math.floor(timeLeft / 1000) % 60;

    console.log(
      `Token expires in ${days} days, ${hours}:${minutes}:${seconds} seconds`,
    );
  }

  if (
    loginInfo &&
    loginInfo.expiresAt &&
    loginInfo.expiresAt?.getTime() < Date.now()
  ) {
    console.log('Token is expired, refreshing');
    const response = await refreshAsync(
      {
        ...authConfig,
        refreshToken: loginInfo.refreshToken,
      },
      discovery,
    ).catch(() => null);

    if (response) {
      const newInfo = await secureStorage
        .set('discordOauth', {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt: response.expiresIn && expiresAt(response.expiresIn),
          scope: response.scope || 'identify',
        })
        .catch(() => {
          console.log('Failed to fetch new token');

          return null;
        });

      if (newInfo?.success) {
        console.log('Refreshed token');
        return newInfo.data;
      }

      console.log('Failed to save or validate new token');
      return null;
    }
  }

  if (!loginInfo) console.log('No token found');

  return loginInfo;
};
