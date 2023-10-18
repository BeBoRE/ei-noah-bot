'use client';

import { useRouter } from 'next/navigation';

function Form({
  children,
  action,
  className,
  onSubmitted,
}: {
  children: React.ReactNode;
  action: string;
  className?: string;
  onSubmitted?: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
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
          router.refresh();
          onSubmitted?.(e);
        }
      }}
    >
      {children}
    </form>
  );
}

export default Form;
