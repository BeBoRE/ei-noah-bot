import { headers } from 'next/headers';
import TRPCReactProvider from 'trpc/react';

type Props = {
  children: React.ReactNode;
};

export default function Providers({ children }: Props) {
  return (
    <TRPCReactProvider headers={headers()}>
      {children}
    </TRPCReactProvider>
  );
}
