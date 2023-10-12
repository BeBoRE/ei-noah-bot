import Image from 'next/image';

import cn from 'utils/utils';
import ei from '../../public/ei.png';

export const Icons = {
  Logo: ({ className }: { className: string }) => (
    <Image
      alt="ei Noah Logo"
      className={cn('w-6 h-6', className)}
      src={ei}
    />
  ),
};
