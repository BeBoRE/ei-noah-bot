import Image from 'next/image';

import ei from '../../public/ei.png';

export const Icons = {
  Logo: ({ className }: { className: string }) => (
    <Image
      alt="ei Noah Logo"
      className={className}
      src={ei}
      width={30}
      height={30}
    />
  ),
};
