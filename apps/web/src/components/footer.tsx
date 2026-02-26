export function Footer() {
  return (
    <footer className="border-t border-gray-100 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Qarta. All rights reserved.
        </div>
        <div className="flex gap-6 text-sm text-gray-500">
          <a href="mailto:hello@qarta.eu" className="hover:text-gray-900">
            hello@qarta.eu
          </a>
        </div>
      </div>
    </footer>
  );
}
