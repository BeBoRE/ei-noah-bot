'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield } from 'lucide-react';

import { useLobby } from '@ei/react-shared/context/lobby';

import { Button } from './_components/ui/button';

function GotoLobby() {
  const { lobby } = useLobby();

  return (
    <AnimatePresence initial={false}>
      {lobby && (
        <motion.div
          className="flex items-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <Button variant="default" asChild className="gap-1">
            <Link href="/lobby">
              <Shield className="h-5 w-5" />
              Manage lobby
            </Link>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default GotoLobby;
