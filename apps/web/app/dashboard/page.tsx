import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link'; // 👈 Додаємо лінк для переходу
import Header from '../../components/Header';

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
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('nest_bank_session_token')?.value;

  if (!token) redirect('/');
  const user = await getUserData(token);
  if (!user) redirect('/');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      
      <Header userName={user.name} userEmail={user.email} />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Welcome */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Welcome back, {user.name.split(' ')[0]}!</h2>
            <p className="text-slate-500 text-sm mt-1">Select an account below to view statement or make a transfer.</p>
          </div>
        </div>

        {/* Секція рахунків */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>💳</span> My Active Accounts <span className="text-xs font-normal text-slate-400">(Select to open)</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {user.accounts && user.accounts.length > 0 ? (
              user.accounts.map((acc) => (
                <Link 
                  href={`/dashboard/${acc.id}`} // 👈 Перехід на динамічний роут!
                  key={acc.id} 
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group hover:border-indigo-500 hover:shadow-md block transition-all"
                >
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
                    <span className="text-xs text-slate-400 font-mono group-hover:text-indigo-600 font-bold transition">Manage ➔</span>
                  </div>

                  <div className="mb-4">
                    <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Available Balance</span>
                    <span className="text-3xl font-bold text-slate-900 font-mono">
                      {parseFloat(acc.balance).toFixed(2)} <span className="text-xl font-medium text-slate-500">{acc.currency}</span>
                    </span>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">IBAN</span>
                      <span className="text-xs font-mono text-slate-700">{acc.iban}</span>
                    </div>
                    <span className="text-xs text-slate-300 font-mono">#{acc.id}</span>
                  </div>
                </Link>
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
