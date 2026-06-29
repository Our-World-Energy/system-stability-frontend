import { Bell, Search, User } from 'lucide-react'

export function Navbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell className="size-5" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 transition-colors cursor-pointer">
          <div className="flex size-8 items-center justify-center rounded-full bg-green-500 text-white">
            <User className="size-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-900 leading-tight">Admin</p>
            <p className="text-xs text-slate-500 leading-tight">OWE Platform</p>
          </div>
        </div>
      </div>
    </header>
  )
}
