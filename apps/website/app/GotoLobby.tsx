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
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
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
