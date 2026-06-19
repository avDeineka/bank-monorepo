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

interface TransferManagerProps {
  accounts: BankAccount[];
}

export default function TransferManager({ accounts }: TransferManagerProps) {
  // Вибираємо перший акаунт за замовчуванням
  const [selectedAcc, setSelectedAcc] = useState<BankAccount>(accounts[0]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState<boolean>(false);
  
  // Стан форми
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('regular');
  const [formSubmitLoading, setFormSubmitLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Функція завантаження трансферів (клієнтський фетч з токеном з куки)
  const fetchTransfers = async (accountId: number) => {
    setLoadingTransfers(true);
    try {
      const token = Cookies.get('nest_bank_session_token');
      const res = await fetch(`http://localhost:2999/api/transfers?accountId=${accountId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      const result = await res.json();
      if (result.success) {
        setTransfers(result.data);
      } else {
        setTransfers([]);
      }
    } catch (err) {
      console.error('Failed to fetch transfers', err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  // Перезавантажуємо трансфери при зміні активного рахунку
  useEffect(() => {
    if (selectedAcc) {
      fetchTransfers(selectedAcc.id);
    }
  }, [selectedAcc]);

  // Обробка відправки форми
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormSubmitLoading(true);

    if (!toAccountId || !amount) {
      setFormError('Please fill in all fields');
      setFormSubmitLoading(false);
      return;
    }

    try {
      const token = Cookies.get('nest_bank_session_token');
      const res = await fetch('http://localhost:2999/api/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromAccountId: selectedAcc.id,
          toAccountId: Number(toAccountId),
          amount: Number(amount),
          purpose,
        }),
      });

      const result = await res.json();

      if (res.ok && (result.status === 'success' || result.success)) {
        setFormSuccess(`Transfer successfully completed! ID: ${result.transfer?.id || result.data?.id}`);
        setAmount('');
        setToAccountId('');
        // Рефрешимо список трансферів
        fetchTransfers(selectedAcc.id);
        // ТУТ ЗА БАЖАННЯМ МОЖНА window.location.reload(), щоб оновити баланси карток на сервері
      } else {
        setFormError(result.message || 'Transfer validation failed');
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setFormSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Секція Рахунків (Плитки переїхали сюди для інтерактивності) */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>💳</span> My Active Accounts <span className="text-xs font-normal text-slate-400">(Click to select)</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            const isSelected = selectedAcc.id === acc.id;
            return (
              <div 
                key={acc.id} 
                onClick={() => setSelectedAcc(acc)}
                className={`bg-white rounded-2xl border p-6 shadow-sm relative overflow-hidden group cursor-pointer transition-all ${
                  isSelected ? 'border-indigo-600 ring-2 ring-indigo-600/20 scale-[1.01]' : 'border-slate-200 hover:border-slate-400'
                }`}
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
                  {isSelected && <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Active</span>}
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
                    <span className="text-xs font-mono text-slate-700 tracking-wide">{acc.iban}</span>
                  </div>
                  <span className="text-xs text-slate-300 font-mono">#{acc.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Двоколонковий ландшафт: Форма ліворуч, Таблиця праворуч */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* ФОРМА ТРАНСФЕРУ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm lg:col-span-1 space-y-4">
          <div>
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>💸</span> New Transfer
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Send assets from <span className="font-bold text-indigo-600">{selectedAcc.currency} (#{selectedAcc.id})</span></p>
          </div>

          <form onSubmit={handleTransferSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Destination Account ID</label>
              <input 
                type="number"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                placeholder="e.g. 1"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount ({selectedAcc.currency})</label>
              <input 
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Purpose / Description</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="regular">Regular Transfer</option>
                <option value="convertation USD->GBP">Conversion USD ➔ GBP</option>
                <option value="convertation USD->EUR">Conversion USD ➔ EUR</option>
                <option value="gift">Personal / Gift</option>
              </select>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl font-medium">
                ⚠️ {formError}
              </div>
            )}

            {formSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-xl font-medium">
                ✅ {formSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={formSubmitLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition shadow-sm shadow-indigo-600/10"
            >
              {formSubmitLoading ? 'Processing...' : 'Execute Transfer'}
            </button>
          </form>
        </div>

        {/* ТАБЛИЦЯ ТРАНСФЕРІВ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>📊</span> Statement for Account #{selectedAcc.id}
            </h4>
            <span className="text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-mono text-slate-500">
              {transfers.length} records
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            {loadingTransfers ? (
              <div className="p-12 text-center text-sm text-slate-400 font-medium">⏳ Loading ledger...</div>
            ) : transfers.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-mono text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="p-3">ID / Date</th>
                    <th className="p-3">Route (IBAN)</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {transfers.map((t) => {
                    // Визначаємо, чи це вихідний, чи вхідний трансфер відносно обраного аккаунта
                    const isOutgoing = t.from_account_id === selectedAcc.id;
                    const dateStr = new Date(t.created_at).toLocaleDateString('uk-UA', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    });

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 space-y-0.5">
                          <p className="font-mono font-bold text-slate-700">#{t.id}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{dateStr}</p>
                        </td>
                        <td className="p-3 max-w-[180px] truncate space-y-0.5">
                          <p className="font-mono text-slate-600 truncate">
                            <span className="text-slate-400 font-bold">From:</span> {t.from_iban}
                          </p>
                          <p className="font-mono text-slate-600 truncate">
                            <span className="text-slate-400 font-bold">To:</span> {t.to_iban}
                          </p>
                        </td>
                        <td className="p-3 text-slate-500 italic max-w-[120px] truncate">
                          {t.purpose}
                          {Number(t.rate) !== 1 && (
                            <span className="block text-[10px] text-indigo-500 font-mono not-italic font-semibold">
                              Rate: {Number(t.rate).toFixed(4)}
                            </span>
                          )}
                        </td>
                        <td className={`p-3 text-right font-mono font-bold text-sm ${
                          isOutgoing ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {isOutgoing ? '-' : '+'}{parseFloat(t.amount).toFixed(2)} {t.currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-sm text-slate-400">
                📭 No transfers recorded for this account.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
