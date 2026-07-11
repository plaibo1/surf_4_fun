import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseMessage(text: string) {
  if (!text) return [];
  // Regular expression for links and IPs (with or without connect prefix)
  const regex = /(https?:\/\/[^\s]+|(?:connect\s+)?\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d{1,5})?\b)/gi;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    const isUrl = /^https?:\/\//i.test(part);
    const isCS = !isUrl && /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d{1,5})?\b/i.test(part);

    return {
      id: index,
      isLink: isUrl || isCS,
      isCS: isCS,
      text: part,
      ip: isCS ? part.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d{1,5})?\b/)?.[0] : null
    };
  }).filter((p): p is NonNullable<typeof p> => !!(p && p.text));
}
