import { cva } from 'class-variance-authority';

const navigationMenuTriggerStyle = cva(
  'group inline-flex h-10 w-max items-center justify-center rounded-md bg-white px-3 py-3 text-sm font-medium transition-colors hover:bg-primary-50 hover:text-primary-900 focus:bg-primary-50 focus:text-primary-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-primary-50 data-[state=open]:bg-primary-50 dark:bg-primary-950 dark:hover:bg-primary-800 dark:hover:text-primary-50 dark:focus:bg-primary-800 dark:focus:text-primary-50 dark:data-[active]:bg-primary-800/50 dark:data-[state=open]:bg-primary-800/50',
);

export default navigationMenuTriggerStyle;
