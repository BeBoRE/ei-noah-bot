import { LobbyProvider } from '@ei/react-shared/context/lobby';

type Props = {
  children?: React.ReactNode;
};

function LobbyLayout({ children }: Props) {
  return <LobbyProvider enabled>{children}</LobbyProvider>;
}

export default LobbyLayout;
