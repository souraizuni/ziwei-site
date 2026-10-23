/** next/link 的单页版替身：渲染普通 <a>，点击由 site/location.ts 接手 */
import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { internalPath, navigate, toHref } from '../location';

type Href = string | { pathname?: string; query?: Record<string, string> };

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: Href;
  replace?: boolean;
  prefetch?: boolean;
  scroll?: boolean;
  shallow?: boolean;
}

function hrefString(href: Href): string {
  if (typeof href === 'string') return href;
  const q = href.query ? '?' + new URLSearchParams(href.query).toString() : '';
  return (href.pathname ?? '/') + q;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, replace, prefetch: _p, scroll: _s, shallow: _sh, onClick, ...rest }, ref,
) {
  const h = hrefString(href);
  return (
    <a
      ref={ref}
      href={toHref(h)}
      {...rest}
      onClick={e => {
        onClick?.(e);
        if (e.defaultPrevented || !internalPath(e.nativeEvent, e.currentTarget)) return;
        e.preventDefault();
        navigate(h, replace);
      }}
    />
  );
});

export default Link;
