import Link from 'next/link';
import './globals.css';

// Requests outside any language prefix (rare: the middleware redirects them).
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="nf-global">
        <main className="container nf">
          <img src="/brand/lek-info/lek-info-horizontal-light-web.svg" alt="LËK Info" width={240} height={94} />
          <h1>Page introuvable · Page not found</h1>
          <p>
            <Link href="/fr">Accueil (français)</Link> · <Link href="/en">Home (English)</Link> · <Link href="/ar">الرئيسية</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
