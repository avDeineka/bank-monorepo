import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TransferManager from '../../components/TransferManager'; // 👈 Імпорт менеджера

export const dynamic = 'force-dynamic';

interface BankAccount {
  id: number;
  currency: string;
  balance: string;
  iban: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  accounts: BankAccount[];
}

async function getUserData(token: string): Promise<UserProfile | null> {
  try {
    const res = await fetch('http://localhost:2999/api/me', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error(`[Dashboard Server] Auth check failed with status: ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('[Dashboard Server] Fetching user data failed:', error.message);
    return null;
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('nest_bank_session_token')?.value;

  if (!token) {
    redirect('/');
  }

  const user = await getUserData(token);

  if (!user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      
      {/* Header системи */}
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
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-400 font-mono">{user.email}</p>
            </div>
            {/* Людський Sign Out через бекенд-ендпоінт */}
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

      {/* Головний контент */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Секція профілю */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Welcome back, {user.name.split(' ')[0]}!</h2>
            <p className="text-slate-500 text-sm mt-1">Here is the current state of your multi-currency portfolio.</p>
          </div>
          <div className="flex flex-wrap gap-3 font-mono text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div><span className="font-bold text-slate-400">ID:</span> #{user.id}</div>
            <div className="hidden sm:block">|</div>
            <div><span className="font-bold text-slate-400">ROLE:</span> <span className="uppercase text-indigo-600 font-semibold">{user.role}</span></div>
            <div>|</div>
            <div><span className="font-bold text-slate-400">PHONE:</span> {user.phone || 'N/A'}</div>
          </div>
        </div>

        {/* Секція Менеджера Трансферів */}
        {user.accounts && user.accounts.length > 0 ? (
          <TransferManager accounts={user.accounts} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            ⚠️ No bank accounts linked to this user yet.
          </div>
        )}

      </main>
    </div>
  );
}
