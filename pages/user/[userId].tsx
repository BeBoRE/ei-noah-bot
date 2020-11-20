import { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import Login from '../../components/Login';
import { GuildUser } from '../../data/entity/GuildUser';
import Quote from '../../data/entity/Quote';
import { useUser } from '../../lib/hooks/useUser';

const UserPage : NextPage = () => {
  const router = useRouter();

  let user = null;
  let loading = true;
  if (typeof router.query.userId === 'string') { [user, { loading }] = useUser(router.query.userId); }

  let guildUsers;
  if (!loading && user) {
    guildUsers = (user?.user.guildUsers as unknown as GuildUser[])
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
  }

  if (typeof router.query.userId !== 'string') { return <h1>Give valid user</h1>; }

  return (
    <Login>
      <>
        {user ? (
          <>
            <h1>
              {user.username}
              &apos;s quotes
            </h1>
            {guildUsers}
          </>
        ) : <h1>{loading ? 'Loading User' : 'User not found'}</h1>}

      </>
    </Login>

  );
};

export default UserPage;
