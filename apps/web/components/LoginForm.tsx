'use client';

import React, { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Наш Next.js Public Gateway URL з Docker Compose мапиться на localhost:2999
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:2999';
      
      const res = await fetch(`${gatewayUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      // Тимчасовий лог, щоб перевірити чи прилітає токен
      console.log('🎉 Successfully authenticated! Token:', data.accessToken);
      alert('Success! Token received (check console).');
      
      // Сюди ми згодом допишемо збереження у куки та редірект на Dashboard

    } catch (err: any) {
      console.error('Login error:', err.message);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
          Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3 text-white font-medium rounded-lg text-sm mt-2 transition shadow ${
          loading 
            ? 'bg-slate-400 cursor-not-allowed' 
            : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
        }`}
      >
        {loading ? 'Signing in...' : 'Login'}
      </button>
    </form>
  );
}
