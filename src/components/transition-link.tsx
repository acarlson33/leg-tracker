"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface TransitionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
}

/**
 * Drop-in replacement for <Link> that wraps navigation with the
 * View Transition API (document.startViewTransition) when available,
 * falling back to a plain router.push() in browsers that don't support it.
 */
export function TransitionLink({
  href,
  children,
  className,
  onClick,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Let the browser handle modifier-key clicks (new tab, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      e.preventDefault();

      if (onClick) {
        onClick(e);
      }

      if (typeof document.startViewTransition !== "function") {
        router.push(href);
        return;
      }

      document.startViewTransition(() => {
        router.push(href);
      });
    },
    [href, onClick, router],
  );

  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
