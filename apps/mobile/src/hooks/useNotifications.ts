import { useEffect } from 'react';
import {
  setNotificationCategoryAsync,
  useLastNotificationResponse,
} from 'expo-notifications';
import { useAuth } from 'src/context/auth';
import { PusherTasks } from 'src/context/pusher';
import { api, createVanillaApi } from 'src/utils/api';
import registerForPushNotificationsAsync from 'src/utils/registerForPushNotifications';
import { secureStorage } from 'src/utils/storage/secureStorage';

import { userAddNotificationSchema, userIdToPusherChannel } from '@ei/lobby';

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
      if (!response) return;

      if (
        'categoryIdentifier' in response.notification.request.content &&
        response.notification.request.content.categoryIdentifier ===
          'userAdd' &&
        response.actionIdentifier === 'accept'
      ) {
        const data = userAddNotificationSchema.safeParse(
          response.notification.request.content.data,
        );

        if (!data.success) return;

        const actualAuthInfo = await secureStorage.get('discordOauth');
        if (!actualAuthInfo) return;

        const client = createVanillaApi(actualAuthInfo.accessToken);

        const outsidePusher = PusherTasks(client);

        const me = await client.user.me.query();

        outsidePusher.signin();
        outsidePusher.bind('pusher:signin_success', () => {
          outsidePusher
            .subscribe(userIdToPusherChannel(me))
            .bind('pusher:subscription_succeeded', () => {
              outsidePusher?.send_event(
                'client-add-user',
                {
                  user: { id: data.data.userId },
                },
                userIdToPusherChannel(me),
              );
            });
        });
      }
    })();
  }, [response]);
};

export default useNotifications;
