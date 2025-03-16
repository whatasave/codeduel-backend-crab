import type { Route } from './types';

export type Middleware = (route: Route) => Route;

export function use(...middlewares: ((route: Route) => Route)[]) {
  return (target: object | undefined, name: string | symbol): void => {
    if (!target) throw new Error('Middleware decorator can only be used on methods');
    let value = Reflect.get(target, name) as Route;
    Reflect.defineProperty(target, name, {
      set(v: Route) {
        middlewares.forEach((middleware) => {
          v = middleware(v);
        });
        value = v;
      },
      get() {
        return value;
      },
    });
  };
}
