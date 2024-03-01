'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { TooltipTrigger } from '@radix-ui/react-tooltip';
import MemberAvatar from 'app/_components/Avatar';
import { Button } from 'app/_components/ui/button';
import { Skeleton } from 'app/_components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
} from 'app/_components/ui/tooltip';
import { Check, SearchCheck, X } from 'lucide-react';

import {
  Guild,
  NotApprovedRole,
  Role,
  useRoleUtils,
} from '@ei/react-shared/roles';

type Props = {
  role: Role | NotApprovedRole;
  guild: Guild;
};

function RoleButton({ guild, role }: Props) {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    throw new Error('Invalid guildId');
  }

  const {
    approveRole,
    rejectRole,
    addRole,
    removeRole,
    isPending,
    isApproved,
    isAddable,
    name,
    color,
    canRejectOrApprove,
  } = useRoleUtils(role, guild);

  return (
    <div className="relative aspect-square h-auto w-full rounded-md">
      <Button
        variant="secondary"
        key={role.id}
        className={`relative flex aspect-square h-full w-full flex-col items-center justify-center transition ${
          isAddable ? '' : `outline outline-4`
        }`}
        style={{
          outlineColor: color,
        }}
        disabled={isPending || !isApproved}
        onClick={() => {
          if (!isApproved) return;

          if (isAddable) {
            addRole();
          } else {
            removeRole();
          }
        }}
      >
        <Suspense fallback={null}>
          {role.createdByUserId && (
            <MemberAvatar
              className="absolute left-1 top-1"
              userId={role.createdByUserId}
              guildId={guildId}
            />
          )}
        </Suspense>
        <span
          className="text-xl"
          style={{
            color,
            textShadow: `0 0 0.2rem #000`,
          }}
        >
          {name}
        </span>
      </Button>
      {!isApproved && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SearchCheck className="absolute right-1 top-1 h-6 w-6 text-primary-400" />
            </TooltipTrigger>
            <TooltipContent>
              This role is awaiting approval by a moderator.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canRejectOrApprove && !isApproved && (
        <div className="absolute bottom-0 flex w-full overflow-hidden rounded-b">
          <Button
            className="h-auto w-full rounded-none bg-accept p-1 py-2 hover:bg-accept/75 dark:bg-accept dark:hover:bg-accept/75"
            variant="secondary"
            aria-label="Approve"
            onClick={() => approveRole()}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            className="h-auto w-full rounded-none bg-reject p-1 py-2 hover:bg-reject/75 dark:bg-reject dark:hover:bg-reject/75"
            variant="secondary"
            aria-label="Reject"
            onClick={() => rejectRole()}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function RoleSkeleton() {
  return <Skeleton className="aspect-square h-auto w-full rounded-md" />;
}

export default RoleButton;
