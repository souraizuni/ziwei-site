/** next/navigation 的单页版替身（本站用到的部分） */
import { navigate, useLocation } from '../location';

export class NotFoundError extends Error {
  constructor() { super('NEXT_NOT_FOUND'); }
}

export function notFound(): never {
  throw new NotFoundError();
}

const router = {
  push: (href: string) => navigate(href),
  replace: (href: string) => navigate(href, true),
  back: () => history.back(),
  forward: () => history.forward(),
  refresh: () => {},
  prefetch: () => {},
};

export function useRouter() {
  return router;
}

export function usePathname(): string {
  return useLocation().pathname;
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams(useLocation().search);
}
