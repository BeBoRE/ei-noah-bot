import useSWR from 'swr';
import { ExtendedUser } from '../passport';

export const fetcher = (url : string) => fetch(url).then((res) => {
  if (res.ok) return res.json();
  return null;
});

export function useUser() {
  const { data, mutate } = useSWR<ExtendedUser | null>('/api/user', fetcher);
  // if data is not defined, the query has not completed
  const loading = data === undefined;
  const toReturn = [data, { mutate, loading }] as const;
  Object.freeze(toReturn);
  return toReturn;
}
