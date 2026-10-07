import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SAFE_URL_PATTERN = /^(https?:)?\/\//i;

/**
 * Only allow http(s) URLs from untrusted (event-sourced) strings.
 * Returns undefined for anything that isn't a safe absolute URL.
 */
export function sanitizeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!SAFE_URL_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}
