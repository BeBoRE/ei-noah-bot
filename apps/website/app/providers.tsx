import { LobbyProvider } from '@ei/react-shared/context/lobby';

import TRPCReactProvider from 'trpc/react';
import { headers } from 'next/headers';

type Props = {
  children: React.ReactNode;
};

export default function Providers({ children }: Props) {
  return (
    <TRPCReactProvider headers={headers()}>
      <LobbyProvider>{children}</LobbyProvider>
    </TRPCReactProvider>
  );
}
