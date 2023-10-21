"use client"

import { useLobby } from '@ei/react-shared/context/lobby'

function LobbyScreen() {
  const { lobby } = useLobby()

  return (
    <div>
      <p>
        {
          JSON.stringify(lobby)
        }
      </p>
    </div>
  )
}

export default LobbyScreen;
