import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TransferManagerStandalone from '../../../components/TransferManagerStandalone'; // Новий спрощений клієнтський компонент

export const dynamic = 'force-dynamic';

interface BankAccount {
  id: number;
  currency: string;
  balance: string;
  iban: string;
  created_at: string;
}

// Запит конкретного акаунта користувача, щоб перевірити приналежність на сервері
async function getAccountData(token: string, accountId: string): Promise<BankAccount | null> {
  try {
    // Смикаємо наш шлюз (/api/me повертає весь профіль з акаунтами, знайдемо потрібний)
    const res = await fetch('http://localhost:2999/api/me', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const profile = await res.json();
    
    const account = profile.accounts.find((acc: BankAccount) => acc.id === Number(accountId));
    return account || null;
  } catch (error) {
    return null;
  }
}

interface PageProps {
  params: Promise<{ accountId: string }>;
}

export default async function AccountDetailPage({ params }: PageProps) {
  const { accountId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('nest_bank_session_token')?.value;

  if (!token) redirect('/');

  // Перевіряємо, чи має користувач доступ до цього рахунку
  const account = await getAccountData(token, accountId);
  
  // Якщо рахунок не знайдено або він чужий — повертаємо на дашборд
  if (!account) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <span className="text-xl group-hover:-translate-x-1 transition-transform">⬅️</span>
            <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Return to accounts list</span>
          </Link>
          <span className="text-xs bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-indigo-700 font-bold uppercase tracking-wider font-mono">
            Secure Session active
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        
        {/* Шапка самого рахунку */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Active Account Context</span>
            <h2 className="text-2xl font-bold text-slate-800 mt-0.5">{account.currency} Portfolio View</h2>
            <p className="text-xs text-slate-500 font-mono mt-1">IBAN: {account.iban}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Current Balance</span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {parseFloat(account.balance).toFixed(2)} <span className="text-slate-500 text-lg font-medium">{account.currency}</span>
            </span>
          </div>
        </div>

        {/* Клієнтська зона з формою і таблицею саме для цього акаунта */}
        <TransferManagerStandalone account={account} />

      </main>
    </div>
  );
}
