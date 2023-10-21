"use client";

import { useLobby } from "@ei/react-shared/context/lobby";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./_components/ui/button";

function GotoLobby() {
  const { lobby } = useLobby();

  return (
    <AnimatePresence>
      {lobby &&(<motion.div 
        className="flex items-center"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
      >
        <Button
          variant="default"
          asChild
        >
          <Link href='/lobby'>
            Manage lobby
          </Link>
        </Button>
      </motion.div>)}
    </AnimatePresence>
  )
}

export default GotoLobby;
