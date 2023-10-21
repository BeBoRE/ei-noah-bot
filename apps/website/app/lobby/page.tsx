"use client"

import { useLobby } from '@ei/react-shared/context/lobby'

function LobbyScreen() {
  const { lobby } = useLobby()

  return (
    <div className='flex-1'>
      <pre>
        {
          JSON.stringify(lobby, null, 2)
        }
      </pre>
    </div>
  )
}

export default LobbyScreen;
