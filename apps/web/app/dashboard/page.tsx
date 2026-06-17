import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Інтерфейси під твою структуру відповіді
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
  // Читаємо куки на сервері Next.js
  const cookieStore = await cookies();
  const token = cookieStore.get('nest_bank_session_token')?.value;

  // Якщо токена немає — давай до побачення на сторінку входу
  if (!token) {
    redirect('/');
  }

  // Робимо запит до нашого шлюзу
  const user = await getUserData(token);

  // Якщо токен протух або шлюз його не прийняв — теж редірект
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
            {/* Тимчасова кнопка виходу (просто рефрешнемо локацію після видалення куки) */}
            <button 
              onClick={`document.cookie = "nest_bank_session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; window.location.href="/";`}
              // Оскільки це Server Component, такий inline-костиль для кліка працюватиме, але ми його потім загартуємо
              className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition"
            >
              Sign Out
            </button>
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

        {/* Секція рахунків / акаунтів */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>💳</span> My Active Accounts
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {user.accounts && user.accounts.length > 0 ? (
              user.accounts.map((acc) => (
                <div 
                  key={acc.id} 
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition"
                >
                  {/* Фонова декоративна плашка валюти */}
                  <div className="absolute -right-4 -bottom-6 text-7xl font-black text-slate-50 opacity-[0.03] select-none font-mono group-hover:opacity-[0.06] transition">
                    {acc.currency}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono tracking-wider ${
                      acc.currency === 'USD' ? 'bg-green-50 text-green-700 border border-green-200' :
                      acc.currency === 'EUR' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {acc.currency} Account
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{acc.id}</span>
                  </div>

                  <div className="mb-4">
                    <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Available Balance</span>
                    <span className="text-3xl font-bold text-slate-900 font-mono">
                      {parseFloat(acc.balance).toFixed(2)} <span className="text-xl font-medium text-slate-500">{acc.currency}</span>
                    </span>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">IBAN</span>
                    <span className="text-xs font-mono text-slate-700 select-all tracking-wide">{acc.iban}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                ⚠️ No bank accounts linked to this user yet.
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}