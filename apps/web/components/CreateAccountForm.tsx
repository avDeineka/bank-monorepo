'use client';

import React, { useState } from 'react';
import Cookies from 'js-cookie';
import { GATEWAY_URL } from '../config';

// Фіксований список валют з нашої бізнес-домови
const ALL_SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF'];

interface CreateAccountFormProps {
  existingCurrencies: string[];
}

export default function CreateAccountForm({ existingCurrencies }: CreateAccountFormProps) {
  // Вираховуємо, які валюти ще доступні для відкриття
  const availableCurrencies = ALL_SUPPORTED_CURRENCIES.filter(
    (cur) => !existingCurrencies.includes(cur)
  );

  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    availableCurrencies[0] || ''
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Якщо користувач уже відкрив рахунки у всіх 4 валютах
  if (availableCurrencies.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center text-xs font-medium text-slate-500 shadow-sm">
        🎉 You have active portfolios for all supported currencies (USD, EUR, GBP, CHF).
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = Cookies.get('nest_bank_session_token');
      
      const res = await fetch(`${GATEWAY_URL}/api/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currency: selectedCurrency }),
      });

      const result = await res.json();

      if (res.ok) {
        setSuccess(true);
        // Миттєво перезавантажуємо сторінку, щоб SSR-компонент підтягнув новий рахунок з бази
        window.location.reload();
      } else {
        setError(result.message || 'Failed to open account');
      }
    } catch (err) {
      setError('Network communication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div>
        <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span>✨</span> Open Multi-Currency Account
        </h4>
        <p className="text-xs text-slate-400 mt-0.5">
          Instantly generate a new unique IBAN portfolio.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Select Currency
          </label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            disabled={loading}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 transition"
          >
            {availableCurrencies.map((cur) => (
              <option key={cur} value={cur}>
                {cur} Portfolio
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 px-6 rounded-xl text-sm transition shadow-sm h-[42px] flex items-center justify-center whitespace-nowrap"
        >
          {loading ? 'Opening...' : 'Open Account'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl font-medium">
          ⚠️ {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl font-medium">
          ✅ Portfolio created! Syncing ecosystem ledger...
        </div>
      )}
    </div>
  );
}
