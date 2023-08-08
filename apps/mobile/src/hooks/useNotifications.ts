import { useEffect } from "react"
import { useAuth } from "src/context/auth"
import { api, createVanillaApi } from "src/utils/api"
import registerForPushNotificationsAsync from "src/utils/registerForPushNotifications"
import { addNotificationResponseReceivedListener } from 'expo-notifications'
import { PusherTasks } from "src/context/pusher"
import { userAddNotificationSchema, userIdToPusherChannel } from "@ei/lobby"
import { setNotificationCategoryAsync } from "expo-notifications"
import { secureStorage } from "src/utils/storage/secureStorage"

const useNotifications = () => {
  const { authInfo } = useAuth();
  const { data: me } = api.user.me.useQuery();
  const { mutate: setToken } = api.notification.setToken.useMutation({
    onError: (error) => {
      console.log(error)
    }
  });

  useEffect(() => {
    setNotificationCategoryAsync('userAdd', [
      {
        identifier: 'accept',
        buttonTitle: 'Accept',
        options: {
          isAuthenticationRequired: true,
          isDestructive: false
        }
      }
    ]).catch(error => {
      console.log(error)
    })
  }, [])
 
  useEffect(() => {
    if (!authInfo) return;

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setToken({token})
      }
    }).catch(error => {
      console.log(error)
    })

    try {
      addNotificationResponseReceivedListener(async (response) => {
        if ('categoryIdentifier' in response.notification.request.content && response.notification.request.content.categoryIdentifier === 'userAdd' && response.actionIdentifier === 'accept' && me) {
          const data = userAddNotificationSchema.safeParse(response.notification.request.content.data);
  
          if (!data.success) return;
          
          const authInfo = await secureStorage.get('discordOauth')
          if (!authInfo) return;
  
          const client = createVanillaApi(authInfo.accessToken)
  
          const outsidePusher = PusherTasks(client);
  
          outsidePusher.signin()
          outsidePusher.bind('pusher:signin_success', () => {
            outsidePusher.subscribe(userIdToPusherChannel(me)).bind('pusher:subscription_succeeded', () => {
              outsidePusher?.send_event('client-add-user', {
                user: {id: data.data.userId},
              }, userIdToPusherChannel(me))
            })
          })
        }
      })
    } catch (error) {
      console.log(error)
    }
  }, [authInfo?.accessToken])
}

export default useNotifications;
