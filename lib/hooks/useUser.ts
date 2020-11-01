import useSWR from 'swr';
import { ExtendedUser } from '../../data/data';

export const fetcher = (url : string) => fetch(url).then((res) => {
  if (res.ok) return res.json();
  throw new Error(res.statusText);
});

export function useUser(id?: string) {
  const { data, mutate, error } = useSWR<ExtendedUser | null>(`/api/user${id ? `/${id}` : ''}`, fetcher);
  // if data is not defined, the query has not completed
  const loading = data === undefined && !error;
  const errorCasted = (error as Error);
  const toReturn = [data, { mutate, loading, error: errorCasted }] as const;
  Object.freeze(toReturn);
  return toReturn;
}
