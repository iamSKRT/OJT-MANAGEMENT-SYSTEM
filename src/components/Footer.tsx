export default function Footer() {
  return (
    <footer className="border-t py-4 mt-8">
      <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
        Copyright © 2026 Christian Dave. All rights reserved. View the source code on{' '}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline font-medium"
        >
          GitHub
        </a>
        .
      </div>
    </footer>
  );
}
