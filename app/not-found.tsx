import './globals.css';

// Requests outside any language prefix (rare: the middleware redirects them).
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body className="nf-global">
        <main className="container nf">
          <img src="/brand/lek-horizontal-navy.svg" alt="LËK Network" width={240} height={80} />
          <h1>Page introuvable · Page not found</h1>
          <p>
            <a href="/fr">Accueil (français)</a> · <a href="/en">Home (English)</a> · <a href="/ar">الرئيسية</a>
          </p>
        </main>
      </body>
    </html>
  );
}
