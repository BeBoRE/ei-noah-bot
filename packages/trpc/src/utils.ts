import { camelCase, isArray, isObject, transform } from 'lodash';

/* eslint-disable import/prefer-default-export */
export const camelize = (obj: unknown) => {
  if (!isObject(obj)) return obj;

  return transform(
    obj,
    (result: Record<string, unknown>, value: unknown, key: string, target) => {
      const camelKey = isArray(target) ? key : camelCase(key);
      // eslint-disable-next-line no-param-reassign
      result[camelKey] = isObject(value)
        ? camelize(value as Record<string, unknown>)
        : value;
    },
  );
};
