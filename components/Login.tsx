import { useRouter } from 'next/router';
import React from 'react';
import { useUser } from '../lib/hooks/useUser';
import { LoginForm } from './LoginForm';

interface Props {
  children: JSX.Element | undefined
}

export default function Login({ children } : Props) : JSX.Element {
  const [user, { loading }] = useUser();
  const router = useRouter();

  if (user) {
    if (children) return children;
    router.push('/');
  }

  if (loading) return <h1>Checking your authenticity</h1>;

  return <LoginForm />;
}

export { Login };
