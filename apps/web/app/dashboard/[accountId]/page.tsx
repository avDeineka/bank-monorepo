import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import TransferManagerStandalone from '../../../components/TransferManagerStandalone';

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

async function getUserProfile(token: string): Promise<UserProfile | null> {
  try {
    const res = await fetch('http://localhost:2999/api/me', {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
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

  const user = await getUserProfile(token);
  if (!user) redirect('/');

  const account = user.accounts.find((acc) => acc.id === Number(accountId));
  if (!account) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">

      {/* Спільна шапка */}
      <Header userName={user.name} userEmail={user.email} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Навігація */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 shadow-sm transition">
            <span className="text-sm group-hover:-translate-x-0.5 transition-transform">⬅️</span>
            <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Return to accounts list</span>
          </Link>
          <span className="text-[10px] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full text-indigo-700 font-bold font-mono uppercase tracking-wider">
            Account ID: #{account.id}
          </span>
        </div>

        {/* Робоча зона */}
        <TransferManagerStandalone initialAccount={account} />

      </main>
    </div>
  );
}
