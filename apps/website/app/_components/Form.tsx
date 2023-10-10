'use client';

import { useRouter } from 'next/navigation';

const Form = ({
  children,
  action,
  className
}: {
  children: React.ReactNode;
  action: string;
  className?: string;
}) => {
  const router = useRouter();
  return (
    <form
      className={className}
      action={action}
      method="post"
      onSubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const response = await fetch(action, {
          method: 'POST',
          body: formData,
          redirect: 'manual',
        });

        if (response.status === 0) {
          // redirected
          // when using `redirect: "manual"`, response status 0 is returned
          return router.refresh();
        }
      }}
    >
      {children}
    </form>
  );
};

export default Form;
