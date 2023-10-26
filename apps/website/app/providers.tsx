import { headers } from 'next/headers';
import TRPCReactProvider from 'trpc/react';

import { LobbyProvider } from '@ei/react-shared/context/lobby';

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
