import { useEffect } from 'react';
import {
  NotificationResponse,
  setNotificationCategoryAsync,
  useLastNotificationResponse,
} from 'expo-notifications';
import { useAuth } from 'src/context/auth';
import { api, createVanillaApi } from 'src/utils/api';
import { isTokenExpired } from 'src/utils/auth';
import registerForPushNotificationsAsync from 'src/utils/registerForPushNotifications';
import { secureStorage } from 'src/utils/storage/secureStorage';

import { userAddNotificationSchema } from '@ei/lobby';

export const onAcceptResponse = async (
  response: NotificationResponse | undefined | null,
) => {
  if (!response) return;

  if (
    'categoryIdentifier' in response.notification.request.content &&
    response.notification.request.content.categoryIdentifier === 'userAdd' &&
    response.actionIdentifier === 'accept'
  ) {
    const data = userAddNotificationSchema.safeParse(
      response.notification.request.content.data,
    );

    if (!data.success) return;

    const actualAuthInfo = await secureStorage.get('discordOauth');
    if (!actualAuthInfo) return;
    if (isTokenExpired(actualAuthInfo)) return;

    const client = createVanillaApi(actualAuthInfo.accessToken);

    await client.lobby.addUser.mutate({
      user: {
        id: data.data.userId,
      }
    });
  }
};

const useNotifications = () => {
  const { authInfo } = useAuth();
  const { mutate: setToken } = api.notification.setToken.useMutation({
    onError: (error) => {
      console.log(error);
    },
  });

  useEffect(() => {
    setNotificationCategoryAsync('userAdd', [
      {
        identifier: 'accept',
        buttonTitle: 'Accept',
        options: {
          isAuthenticationRequired: true,
          isDestructive: false,
        },
      },
    ]).catch((error) => {
      console.log(error);
    });
  }, []);

  useEffect(() => {
    if (!authInfo?.accessToken) return;

    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          setToken({ token });
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, [authInfo?.accessToken, setToken]);

  const response = useLastNotificationResponse();
  useEffect(() => {
    (async () => {
      onAcceptResponse(response);
    })();
  }, [response]);
};

export default useNotifications;
