import { ZodType, z, SafeParseSuccess, SafeParseError } from 'zod'
import SecureStore from 'expo-secure-store'
import AsyncStorage, { AsyncStorageStatic } from '@react-native-async-storage/async-storage';
import { parse, stringify } from 'superjson'

type SecureStoreType = {
  getItemAsync: typeof SecureStore.getItemAsync,
  setItemAsync: typeof SecureStore.setItemAsync,
  deleteItemAsync: typeof SecureStore.deleteItemAsync,
}

const stringifiedNull = stringify(null);

const getKeyWithParam = (key: string, param ?: string) => param ? `${key}/param` : key;

const createAnyStoreManager = <T extends {[key: string]: ZodType<unknown>}, S extends SecureStoreType | AsyncStorageStatic>(validators: T, store : S) => {
  const get = async <K extends keyof T>(key : K, param ?: string) : Promise<SafeParseSuccess<z.infer<T[K]>>['data'] | null> => {
    const validator = validators[key];

    if(typeof key !== 'string') {
      throw new Error('Key must be a string');
    }

    if(!validator) {
      throw new Error(`No validator found for ${key}`);
    }

    const completeKey = getKeyWithParam(key, param);

    const value = await (('getItemAsync' in store) ? store.getItemAsync(completeKey) : store.getItem(completeKey)) || stringifiedNull;

    const parsed = parse(value);

    const validated = validator.safeParse(parsed);

    if(!validated.success) {
      console.warn(`Retrieved invalid value for ${key}`, validated.error);
      return null;
    }

    return validated.data;
  }

  const set = async <K extends keyof T>(key : K, value: z.infer<T[K]>, param ?: string) : Promise<SafeParseError<z.infer<T[K]>>["error"] | null> => {
    const validator = validators[key];

    if(typeof key !== 'string') {
      throw new Error('Key must be a string');
    }

    if(!validator) {
      throw new Error(`No validator found for ${key}`);
    }

    const validated = validator.safeParse(value);

    if(!validated.success) {
      return validated.error;
    }

    const stringified = stringify(value);

    const completeKey = getKeyWithParam(key, param);
    return await (('setItemAsync' in store) ? store.setItemAsync(completeKey, stringified) : store.setItem(completeKey, stringified)).then(() => null);
  }

  const doDelete = async <K extends keyof T>(key : K, param ?: string) : Promise<void> => {
    if(typeof key !== 'string') {
      throw new Error('Key must be a string');
    }

    const completeKey = getKeyWithParam(key, param);
    return await (('deleteItemAsync' in store) ? store.deleteItemAsync(completeKey) : store.removeItem(completeKey));
  }

  return { get, set, delete: doDelete }
}

export const createSecureStore = <T extends {[key: string]: ZodType<unknown>}>(validators: T) => createAnyStoreManager(validators, SecureStore);
export const createAsyncStorage = <T extends {[key: string]: ZodType<unknown>}>(validators: T) => createAnyStoreManager(validators, AsyncStorage);
