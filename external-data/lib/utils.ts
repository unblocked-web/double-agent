import IResolvablePromise from '../interfaces/IResolvablePromise';
import Resolvable from './Resolvable';

export function bindFunctions(self: any): void {
  let object = self;
  do {
    for (const key of Reflect.ownKeys(object)) {
      if (key === 'constructor') {
        continue;
      }
      const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
      if (descriptor && typeof descriptor.value === 'function') {
        self[key] = self[key].bind(self);
      }
    }
    object = Reflect.getPrototypeOf(object);
  } while (object && object !== Object.prototype);
}

export function createPromise<T = any>(
    timeoutMillis?: number,
    timeoutMessage?: string,
): IResolvablePromise<T> {
  return new Resolvable<T>(timeoutMillis, timeoutMessage);
}
