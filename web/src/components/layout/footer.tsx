export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-slate-400">
            Arbiter &mdash; Ethereum escrow with dispute resolution
          </p>
          <p className="text-xs text-slate-300">Local Hardhat Network</p>
        </div>
      </div>
    </footer>
  );
}
