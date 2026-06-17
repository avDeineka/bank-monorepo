'use client';

import React, { useState } from 'react';
import Cookies from 'js-cookie';

export default function LoginForm() {
  // Перемикач режиму: false = Login (Вхід), true = Register (Реєстрація)
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Поля форми
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Для реєстрації
  
  // Сервісні стани
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:2999';
      
      // Визначаємо правильний ендпоінт залежно від режиму
      const endpoint = isSignUp ? '/api/register' : '/api/login';
      
      // Формуємо тіло запиту
      const bodyData: Record<string, string> = { email, password };
      if (isSignUp && name) {
        bodyData.name = name; // Додаємо ім'я, тільки якщо це реєстрація
      }

      const res = await fetch(`${gatewayUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      if (isSignUp) {
        // Якщо це була реєстрація — показуємо успіх і перемикаємо на вхід
        setSuccessMessage('Account created successfully! Please sign in.');
        setIsSignUp(false);
        setPassword(''); // Очищаємо пароль для безпеки
      } else {
        // Якщо це був вхід — зберігаємо токен в ІЗОЛЬОВАНУ куку на 1 день
        // expires: 1 означає 24 години
        Cookies.set('nest_bank_session_token', data.accessToken, { 
          expires: 1, 
          secure: process.env.NODE_ENV === 'production', // true тільки на продакшені (HTTPS)
          sameSite: 'strict'
        });

        console.log('🔒 Token saved to nest_bank_session_token');
        
        // Перенаправляємо користувача на дашборд
        // Оскільки сторінки /dashboard ще нема, браузер покаже 404, але ми побачимо сам факт редіректу!
        window.location.href = '/dashboard';
      }

    } catch (err: any) {
      console.error('Auth error:', err.message);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Повідомлення про помилку */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Повідомлення про успішну реєстрацію */}
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm font-medium">
          ✅ {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Поле НАЗВА/ІМ'Я — показується ТІЛЬКИ в режимі реєстрації */}
        {isSignUp && (
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition"
            />
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
          {loading 
            ? (isSignUp ? 'Creating account...' : 'Signing in...') 
            : (isSignUp ? 'Register' : 'Login')}
          </button>
      </form>

      {/* Перемикач режимів під формою */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setSuccessMessage(null);
          }}
          className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline font-medium focus:outline-none"
        >
          {isSignUp 
            ? 'Already have an account? Sign In' 
            : "Don't have an account? Sign Up"
          }
        </button>
      </div>
    </div>
  );
}
