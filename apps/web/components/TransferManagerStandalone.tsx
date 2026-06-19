'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface BankAccount {
  id: number;
  currency: string;
  balance: string;
  iban: string;
  created_at: string;
}

interface Transfer {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: string;
  currency: string;
  purpose: string;
  trace_id: string;
  status: string;
  created_at: string;
  rate: string | number;
  from_iban: string;
  to_iban: string;
}

export default function TransferManagerStandalone({ account }: { account: BankAccount }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState<boolean>(false);
  
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('regular');
  const [formSubmitLoading, setFormSubmitLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchTransfers = async () => {
    setLoadingTransfers(true);
    try {
      const token = Cookies.get('nest_bank_session_token');
      const res = await fetch(`http://localhost:2999/api/transfers?accountId=${account.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) setTransfers(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [account.id]);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormSubmitLoading(true);

    try {
      const token = Cookies.get('nest_bank_session_token');
      const res = await fetch('http://localhost:2999/api/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromAccountId: account.id,
          toAccountId: Number(toAccountId),
          amount: Number(amount),
          purpose,
        }),
      });

      const result = await res.json();

      if (res.ok && (result.status === 'success' || result.success)) {
        setFormSuccess('Transfer successfully completed!');
        setAmount('');
        setToAccountId('');
        fetchTransfers(); // Оновлюємо таблицю транзакцій
      } else {
        setFormError(result.message || 'Transfer failed');
      }
    } catch (err) {
      setFormError('Network error');
    } finally {
      setFormSubmitLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      
      {/* ФОРМА */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>💸</span> Execute New Transfer
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">Funds source: Account #{account.id} ({account.currency})</p>
        </div>

        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Destination Account ID</label>
            <input 
              type="number"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              placeholder="Target account ID"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount</label>
            <input 
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Purpose</label>
            <input 
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {formError && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl font-medium">⚠️ {formError}</div>}
          {formSuccess && <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl font-medium">✅ {formSuccess}</div>}

          <button
            type="submit"
            disabled={formSubmitLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition"
          >
            {formSubmitLoading ? 'Processing...' : 'Execute'}
          </button>
        </form>
      </div>

      {/* ТАБЛИЦЯ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm lg:col-span-2 space-y-4">
        <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">📊 Statement Ledger</h4>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          {loadingTransfers ? (
            <div className="p-12 text-center text-sm text-slate-400 font-medium">⏳ Loading ledger...</div>
          ) : transfers.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-mono text-[11px] font-bold text-slate-400 uppercase">
                  <th className="p-3">ID / Date</th>
                  <th className="p-3">Route</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transfers.map((t) => {
                  const isOutgoing = t.from_account_id === account.id;
                  const dateStr = new Date(t.created_at).toLocaleDateString('uk-UA', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  });
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="p-3">
                        <p className="font-mono font-bold text-slate-700">#{t.id}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{dateStr}</p>
                      </td>
                      <td className="p-3 font-mono text-[11px] max-w-[150px] truncate">
                        <p className="truncate"><span className="text-slate-400">Src:</span> {t.from_iban}</p>
                        <p className="truncate"><span className="text-slate-400">Dst:</span> {t.to_iban}</p>
                      </td>
                      <td className="p-3 text-slate-500 italic">
                        {t.purpose}
                        {Number(t.rate) !== 1 && <span className="block text-[10px] text-indigo-500 font-mono not-italic">Rate: {Number(t.rate).toFixed(4)}</span>}
                      </td>
                      <td className={`p-3 text-right font-mono font-bold text-sm ${isOutgoing ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isOutgoing ? '-' : '+'}{parseFloat(t.amount).toFixed(2)} {t.currency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-sm text-slate-400">📭 No transfers recorded.</div>
          )}
        </div>
      </div>

    </div>
  );
}
