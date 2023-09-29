'use client'

import { signIn } from "next-auth/react"
import { Button } from "./ui/button"

function HeaderUser() {
  return (
    <Button variant='outline' onClick={() => {signIn('discord')}}>Login to Discord</Button>
  )
}

export default HeaderUser
