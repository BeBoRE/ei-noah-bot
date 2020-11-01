import { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { GuildUser } from '../../data/entity/GuildUser';
import Quote from '../../data/entity/Quote';
import { useUser } from '../../lib/hooks/useUser';

const UserPage : NextPage = () => {
  const router = useRouter();

  const [user, { loading, error }] = useUser(router.query.userId);

  // useEffect(() => {
  //   if (!loading && !user) router.push('/');
  // }, [user]);

  if (error) return <h1>{error.message}</h1>;
  if (!user) return <h1>Getting User Info</h1>;

  const guildUsers = (user?.user.guildUsers as unknown as GuildUser[])
    .map((gu) => {
      const quotesDuplicates = Array.from(new Set([...gu.quotes, ...gu.createdQuotes]));

      const map = new Map<number, Quote>();

      quotesDuplicates.forEach((q) => {
        if (!map.has(q.id)) map.set(q.id, q);
      });

      const quotes = Array.from(map.values());

      return quotes
        .map((quote) => <p key={quote.id}>{quote.text}</p>);
    });

  if (typeof router.query.userId !== 'string') { return <h1>Give valid user</h1>; }

  return (
    <>
      <h1>
        {user.username}
        &apos;s profile
      </h1>
      {guildUsers}
    </>
  );
};

export default UserPage;
