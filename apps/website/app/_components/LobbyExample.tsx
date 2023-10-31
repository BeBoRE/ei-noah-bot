'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import { useTimeouts } from 'hooks/useTimeouts';
import { api } from 'trpc/react';

import { RouterOutputs } from '@ei/trpc';

import voiceIcon from '../../public/discord-speaker.svg';
import { getUserImageUrl } from './HeaderUser';
import { Icons } from './Icons';
import { Button, ButtonProps } from './ui/button';

type User = Pick<
  Exclude<RouterOutputs['user']['me'], null>,
  'id' | 'avatar' | 'username' | 'globalName'
>;

const exampleUser: User = {
  id: '1331243214324356',
  avatar: null,
  username: 'You',
  globalName: 'You',
};

const friendUser: User = {
  id: '1331242323212',
  avatar: null,
  username: 'Friend',
  globalName: 'Friend',
};

type UserButtonProps = ButtonProps & {
  user: User & {
    isMuted?: boolean;
  };
};

function UserButton({ user, ...props }: UserButtonProps) {
  const toDisplayUser = user;
  const userImage = getUserImageUrl(toDisplayUser);

  return (
    <Button
      variant="secondary"
      className="ml-9 justify-start p-2 dark:hover:bg-primary-700"
      {...props}
    >
      <Image
        src={userImage}
        alt={`${toDisplayUser.globalName}'s avatar`}
        width={30}
        height={30}
        className="mr-2 inline-block rounded-full"
      />
      <span>{toDisplayUser.globalName || toDisplayUser.username}</span>
      {user.isMuted ? (
        <span className="flex-1 px-1 text-right text-xs text-primary-400">
          <Icons.Muted className="h-4 w-4" />
        </span>
      ) : null}
    </Button>
  );
}

const lobbyTypes = [
  {
    type: 'public',
    icon: '🔊',
    name: 'Public',
  },
  {
    type: 'mute',
    icon: '🙊',
    name: 'Mute',
  },
  {
    type: 'private',
    icon: '🔐',
    name: 'Private',
  },
] as const;

type LobbyTypes = (typeof lobbyTypes)[number]['type'];
type ChannelTypes = 'create' | 'lobby';

type VoiceChannelProps = ButtonProps & {
  limit?: number;
  users?: UserButtonProps['user'][];
  lobbyType: LobbyTypes;
  owner?: User;
};

function VoiceChannel({
  limit,
  users,
  lobbyType,
  owner,
  ...props
}: VoiceChannelProps) {
  const type = lobbyTypes.find(({ type: t }) => t === lobbyType)!;

  const name = owner
    ? `${type.icon} ${owner.globalName || owner.username}'s Lobby`
    : `${type.icon} Create ${type.name} Lobby`;

  return (
    <>
      <Button
        variant="secondary"
        className="justify-start dark:hover:bg-primary-700"
        {...props}
      >
        <Image
          src={voiceIcon}
          alt="Voice Channel Icon"
          width={20}
          height={20}
          className="mr-2 inline-block"
        />
        <div className="flex flex-1 justify-start">{name}</div>
        {limit ? (
          <div className="flex min-w-[2rem] overflow-hidden rounded bg-primary-700 text-xs">
            <span className="px-1">0{users?.length || 0}</span>
            <span className="bg-primary-900 px-1">
              {limit < 10 ? `0${limit}` : limit}
            </span>
          </div>
        ) : null}
      </Button>
      {users?.map((user) => <UserButton key={user.id} user={user} />)}
    </>
  );
}

const randomDelay = () => (Math.random() / 4) * 1000 + 300;

function TextBubble({ children }: { children: React.ReactNode }) {
  const date = useMemo(() => new Date(), []);
  const dateText = Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);

  return (
    <div className="flex items-start gap-3 p-2">
      <Icons.Logo className="h-12 w-12" />
      <div className="flex-1">
        <div className="flex items-center gap-1">
          <p className="text-xl font-bold text-[#FFCC5F]">ei Noah</p>
          <p className="rounded bg-discord px-1 py-0.5 text-xs uppercase">
            Bot
          </p>
          <p className="text-sm text-primary-200" suppressHydrationWarning>
            Today at {dateText}
          </p>
        </div>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

function TextBubbleChild({ children }: { children: React.ReactNode }) {
  return <p className="text-primary-900 dark:text-primary-100">{children}</p>;
}

const limits = [0, 2, 5, 10, 12];

type DashboardProps = {
  user: User;
  currentType: LobbyTypes | null;
  currentLimit: number;
  onTypeChange: (type: LobbyTypes) => void;
  onLimitChange: (limit: number) => void;
};
function Dashboard({
  user,
  currentType,
  currentLimit,
  onTypeChange,
  onLimitChange,
}: DashboardProps) {
  const userImage = getUserImageUrl(user);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex max-w-md flex-col gap-2 rounded border-l-4 border-l-[#FFCC5F] bg-primary-800 p-2">
        <div className="flex items-center gap-3">
          <Image
            src={userImage}
            alt={`${user.globalName}'s avatar`}
            width={30}
            height={30}
            className="rounded-full"
          />
          <p className="font-bold">
            Leader: {user.globalName || user.username}
          </p>
        </div>
        <p className="text-sm">This is your dashboard.</p>
        <p className="text-sm">
          From here you can manage your lobby. Do you want to change the lobby
          to be public, mute, or private? Limit or extend the amount of users
          that can join? Pick a more topical name for the channel?
        </p>
        <p className="text-sm">You can do all of that from here.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {lobbyTypes.map(({ type, icon, name }) => (
          <Button
            variant="secondary"
            key={type}
            disabled={currentType === type}
            onClick={() => onTypeChange(type)}
          >
            {icon} {name}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {limits.map((limit) => (
          <Button
            variant="secondary"
            className="min-w-[4rem]"
            key={limit}
            disabled={currentLimit === limit}
            onClick={() => onLimitChange(limit)}
          >
            {limit === 0 ? 'None' : limit}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="min-w-[4rem]">
          ✏️ Rename
        </Button>
      </div>
    </div>
  );
}

function LobbyExample() {
  const { data: user, error } = api.user.me.useQuery(undefined, {
    retry: false,
    staleTime: Infinity,
  });

  const chatRef = useRef<HTMLDivElement>(null);

  const toDisplayUser = error ? exampleUser : user || exampleUser;

  const [lobbyType, setLobbyType] = useState<LobbyTypes | null>(null);
  const [channelType, setChannelType] = useState<ChannelTypes | null>(null);
  const [limit, setLimit] = useState(0);

  const currentType = lobbyTypes.find(({ type }) => type === lobbyType);

  const [messageList, setMessageList] = useState(
    new Set<keyof typeof messages>(['start']),
  );

  const [friendInLobby, setFriendInLobby] = useState(false);
  const [friendIsAllowed, setFriendIsAllowed] = useState<boolean | null>(null);

  const [transferredType, setTransferredType] = useState<LobbyTypes | null>(
    null,
  );
  const [friendInTransferred, setFriendInTransferred] = useState(false);
  const [transferredNameChanged, setTransferredNameChanged] = useState(false);

  const addTimeout = useTimeouts();

  const addMessage = useCallback((message: keyof typeof messages) => {
    setMessageList((list) => {
      const newList = new Set(list);

      newList.add(message);

      return newList;
    });
  }, []);

  const removeMessage = useCallback((message: keyof typeof messages) => {
    setMessageList((list) => {
      const newList = new Set(list);

      newList.delete(message);

      return newList;
    });
  }, []);

  const changeLobbyType = useCallback((type: LobbyTypes | null) => {
    setLobbyType(type);
  }, []);

  const changeChannelType = useCallback(
    (type: ChannelTypes | null) => {
      setChannelType(type);

      if (type === 'lobby') {
        addTimeout(() => {
          addMessage('dashboard');
        }, randomDelay());
      }

      if (type === 'create') {
        removeMessage('dashboard');
        setLimit(0);
      }
    },
    [addMessage, removeMessage, addTimeout],
  );

  const leaveChannel = () => {
    changeChannelType(null);
    changeLobbyType(null);

    setMessageList(new Set([]));

    if (channelType === 'lobby') {
      if (friendInLobby) {
        setTransferredType(currentType?.type || null);
        setFriendInTransferred(true);
        setTransferredNameChanged(false);

        addTimeout(() => {
          setTransferredNameChanged(true);
        }, randomDelay());

        addTimeout(() => {
          setFriendInTransferred(false);

          addTimeout(() => {
            setTransferredType(null);
          }, randomDelay());
        }, randomDelay() + 3000);
      } else {
        setTransferredType(currentType?.type || null);
        setTransferredNameChanged(false);

        addTimeout(() => {
          setTransferredType(null);
        }, randomDelay());
      }
    }

    setFriendInLobby(false);
    setFriendIsAllowed(null);
  };

  const joinCreateChannel = (type: LobbyTypes) => {
    leaveChannel();

    changeChannelType('create');
    changeLobbyType(type);

    const delay = randomDelay();
    addTimeout(() => {
      changeChannelType('lobby');
    }, delay);

    addTimeout(() => {
      addMessage(type);
      console.log('add message', type);
    }, delay + 1000);
  };

  const dashboardChangeType = (type: LobbyTypes) => {
    if (lobbyType === type) return;

    if (type === 'public' && friendInLobby) {
      addTimeout(() => {
        setFriendIsAllowed(true);
      }, randomDelay());
    }

    const delay = randomDelay();
    addTimeout(() => {
      setLobbyType(type);

      if (type === 'private' && friendInLobby && !friendIsAllowed) {
        addTimeout(() => {
          setFriendInLobby(false);
        }, randomDelay());
      }
    }, delay);

    addTimeout(() => {
      addMessage(`${lobbyType}-to-${type}` as keyof typeof messages);
    }, delay + 1000);
  };

  const changeLimit = (newLimit: number) => {
    const delay = randomDelay();

    addTimeout(() => {
      if (newLimit === 0) {
        addMessage('noLimit');
        setLimit(newLimit);
      } else {
        addMessage('limit');
        setLimit(newLimit);
      }
    }, delay);
  };

  useEffect(() => {
    if (channelType === 'lobby' && lobbyType === 'mute' && !friendInLobby) {
      const timeout = setTimeout(() => {
        setFriendInLobby(true);
        setTransferredType(null);

        addMessage('addUserMessage');

        addTimeout(() => {
          addMessage('friendWantsToJoin');
        }, 500);
      }, 5000);

      return () => clearTimeout(timeout);
    }

    return () => {};
  }, [channelType, lobbyType, addMessage, friendInLobby, addTimeout]);

  useEffect(() => {
    if (chatRef) {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messageList]);

  const messages = {
    start: `
      Ei Noah allows for the creation of temporary voice channels, which
      we call lobbies. There are three types of lobbies: public, mute, and
      private. Try creating one by joining a lobby creation channel.
    `,
    dashboard: (
      <Dashboard
        currentLimit={limit}
        user={toDisplayUser}
        currentType={lobbyType}
        onTypeChange={dashboardChangeType}
        onLimitChange={changeLimit}
      />
    ),
    public: `
      You have just created a public lobby. Anyone can join this lobby and talk.
      But don't worry. If you want to make it more private, you can do so by changing
      the lobby type. You can do that from your dashboard.
    `,
    mute: `
      You have just created a mute lobby. Anyone that joins your lobby,
      unless you give them the permission to talk, will be muted. Let's
      see if there is anyone that wants to join our lobby.
    `,
    private: `
      You have just created a private lobby. Only people you have given the permission
      to can join this lobby. If this is not what you wanted, you can change the type of
      lobby from your dashboard.
    `,
    'public-to-mute': `
      You have just changed your lobby from public to mute. Anyone that joins that wasn't in your lobby,
      unless you gave them the permission to talk, will be muted. If this is
      not strict enough for you, change your lobby to private.
    `,
    'public-to-private': `
      You have just changed your lobby from public to private. Anyone that was already in your lobby or
      you have given the permission to join are allowed into your lobby. If this is too strict, change your lobby to mute.
    `,
    'mute-to-public': `
      You have just changed your lobby from mute to public. Anyone can join this lobby and talk.
      Anyone that couldn't talk before, can now talk.
    `,
    'mute-to-private': `
      You have just changed your lobby from mute to private. Only people you have given the permission
      to can join this lobby. Anyone that didn't have permissions to speak before, will be removed from the lobby.
      If this is too strict, change your lobby back to mute or public.
    `,
    'private-to-public': `
      You have just changed your lobby from private to public. Anyone can now join your lobby and talk.
      If you want to make it more private, you can change the lobby type to mute or back to private.
    `,
    'private-to-mute': `
      You have just changed your lobby from private to mute. Anyone that joins that wasn't in your lobby,
      unless you gave them the permission to talk, will be muted. If this is
      still too strict for you, change your lobby back to public.
    `,
    limit: `
      You have limited the amount of users that can join your lobby.
    `,
    noLimit: `
      You have removed the limit on the amount of users that can join your lobby.
    `,
    addUserMessage: !friendIsAllowed ? (
      <div className="flex flex-col items-start gap-2">
        <p>
          Add <span className="text-discord">@Friend</span> to lobby?
        </p>
        <Button
          variant="secondary"
          className="dark:bg-accept hover:dark:bg-accept/80"
          onClick={() => {
            addTimeout(() => {
              addTimeout(() => {
                addMessage('friendNowAllowed');
              }, 600);
              setFriendIsAllowed(true);
            }, randomDelay());
          }}
        >
          Add User
        </Button>
      </div>
    ) : (
      <div className="flex flex-col items-start gap-2">
        <p>
          <span className="text-discord">@Friend</span> can now enter.
        </p>
      </div>
    ),
    friendWantsToJoin: `
      It looks like you have a friend that wants to join your lobby. You can
      allow them to join by pressing the 'Add User' button on the message above.
    `,
    friendNowAllowed: `
      You have allowed your friend to join your lobby. They can now speak and join your lobby at any time.
    `,
  };

  return (
    <div className="flex max-h-[50vh] w-full flex-1 overflow-hidden rounded-lg bg-primary-900">
      <div className="flex-1 md:flex">
        <div className="flex flex-col bg-primary-800 p-2 md:w-64 md:items-stretch">
          <div className="flex flex-col">
            <p className="text-xs uppercase text-primary-300">
              ➕ Create Lobby
            </p>
            {lobbyTypes.map(({ type }) => (
              <Fragment key={type}>
                <VoiceChannel
                  onClick={() => joinCreateChannel(type)}
                  lobbyType={type}
                />
                {lobbyType === type && channelType === 'create' && (
                  <UserButton user={toDisplayUser} />
                )}
              </Fragment>
            ))}
            <p className="text-xs uppercase text-primary-300">🔈 voice</p>
            {transferredType && (
              <VoiceChannel
                lobbyType={transferredType}
                owner={transferredNameChanged ? friendUser : toDisplayUser}
                limit={limit}
                users={friendInTransferred ? [friendUser] : []}
              />
            )}
            {currentType && channelType === 'lobby' && (
              <VoiceChannel
                lobbyType={currentType.type}
                owner={toDisplayUser}
                limit={limit}
                users={
                  friendInLobby
                    ? [
                        toDisplayUser,
                        {
                          ...friendUser,
                          isMuted:
                            !friendIsAllowed &&
                            (lobbyType === 'mute' || lobbyType === 'private'),
                        },
                      ]
                    : [toDisplayUser]
                }
              />
            )}
          </div>
        </div>
        <div className="flex-1 overflow-x-auto" ref={chatRef}>
          {Array.from(messageList).length ? (
            <TextBubble>
              {Array.from(messageList).map((message) =>
                typeof messages[message] === 'string' ? (
                  <TextBubbleChild key={message}>
                    {messages[message]}
                  </TextBubbleChild>
                ) : (
                  <div key={message}>{messages[message]}</div>
                ),
              )}
            </TextBubble>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default LobbyExample;
