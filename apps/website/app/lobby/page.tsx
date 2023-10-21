"use client"

import { generateLobbyName } from '@ei/lobby';
import { useLobby } from '@ei/react-shared/context/lobby'

function LobbyScreen() {
  const { lobby } = useLobby()

  return (
    <div className='flex-1 flex justify-center'>
      <div className='container'>
        {
          lobby && (
            <div className='flex flex-col gap-4 p-4'>
              <div className='flex flex-row items-center justify-center gap-4'>
                <div>
                  {lobby.guild.icon ? (
                    <img
                      src={lobby.guild.icon}
                      className='w-24 h-24 bg-primary-900 rounded-full'
                      alt=''
                    />
                  ) : (
                    <div className='w-24 h-24 bg-secondary rounded-full' />
                  )}
                </div>
                <div className='text-4xl font-bold'>
                  {lobby.guild.name}
                </div>
              </div>
              <div className='text-2xl font-bold text-center'>
                {generateLobbyName(lobby.channel.type, {
                  displayName: lobby.user.displayName
                })?.full}
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}

export default LobbyScreen;
