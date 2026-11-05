import type { ReactNode } from 'react';

// The <html> element lives in app/[locale]/layout.tsx so that lang and dir follow the language.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
