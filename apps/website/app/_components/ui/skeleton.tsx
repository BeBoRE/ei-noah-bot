import { cn } from 'utils/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-primary-100 dark:bg-primary-800',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
