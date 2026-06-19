import React from 'react';

interface HeaderProps {
  userName: string;
  userEmail: string;
}

export default function Header({ userName, userEmail }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🏦</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Nest Bank</h1>
            <p className="text-xs text-slate-400 font-mono">Client Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{userName}</p>
            <p className="text-xs text-slate-400 font-mono">{userEmail}</p>
          </div>
          <a
            href="http://localhost:2999/api/logout"
            onClick={`document.cookie = "nest_bank_session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";`}
            className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition text-center"
          >
            Sign Out
          </a>
        </div>
      </div>
    </header>
  );
}
