import React from 'react';
import LoginForm from '../components/LoginForm';

// змушуємо Next.js рендерити сторінку виключно on-request
export const dynamic = 'force-dynamic'; 

async function getExchangeRates() {
  try {
    // 2. Рішення пастки №2: беремо внутрішній URL для сервера.
    // Якщо запускаємо локально (npm run start:web) -> підтягнеться localhost:2999
    // Якщо запускаємо в Docker -> підтягнеться http://gateway:2999 (додамо в env)
    const gatewayUrl = process.env.INTERNAL_GATEWAY_URL || 'http://localhost:2999';
    
    console.log(`📡 [Next.js Server] Fetching rates from: ${gatewayUrl}/api/pingRater`);

    const res = await fetch(`${gatewayUrl}/api/pingRater`, { 
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error(`Gateway responded with status ${res.status}`);

    const data = await res.json();
    const ratesObj: Record<string, number> = {};

    if (data.rates && typeof data.rates === 'string') {
      data.rates.split(',').forEach((item: string) => {
        const [currency, value] = item.trim().split(':');
        if (currency && value) {
          ratesObj[currency] = parseFloat(value);
        }
      });
      return {
        provider: data.provider || 'Unknown',
        items: ratesObj
      };
    }
    
    throw new Error('Unexpected rates format');
  } catch (error) {
    console.error('❌ Rates fetch failed:', error.message);
    return {
      provider: 'Offline Fallback',
      items: { USD: 1.0, EUR: 0.92, UAH: 40.50 }
    };
  }
}

export default async function HomePage() {
  const { provider, items } = await getExchangeRates();

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-slate-50 p-4 md:p-12 gap-8">
      {/* Ліва колонка: Лого та Курси */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">🏦</span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nest Bank</h1>
            <p className="text-xs text-slate-400 font-mono">Secure Microservice System</p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-700">Live Exchange Rates</h2>
          <p className="text-xs text-slate-400">Provider: <span className="font-medium text-slate-600">{provider}</span></p>
        </div>

        <div className="overflow-hidden border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 text-right">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-600 font-medium">
              {Object.entries(items).map(([currency, rate]) => (
                <tr key={currency} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3 font-semibold text-slate-800">{currency}</td>
                  <td className="px-4 py-3 text-right font-mono text-indigo-600">{rate.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Права колонка: Форма входу */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Sign In</h2>
        <p className="text-slate-400 text-sm mb-6">Access your multi-currency accounts securely</p>

        {/* Вставляємо нашу живу форму замість заглушки */}
        <LoginForm />
      </div>
    </div>
  );
}