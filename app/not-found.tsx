/**
 * app/not-found.tsx
 *
 * Next.js App Router 404 page.
 * - This is a Server Component by default — no 'use client' here.
 * - Framer Motion needs 'use client', so all animated UI lives in
 *   NotFoundClient (a separate client component).
 * - NOTE: `metadata` exports are NOT supported in not-found.tsx
 *   (only in page.tsx / layout.tsx). Title is set in layout.tsx.
 */
import { NotFoundClient } from './components/ui/NotFoundClient';

export default function NotFound() {
  return <NotFoundClient />;
}
