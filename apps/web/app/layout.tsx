import React from 'react';
import './global.css';

export const metadata = {
  title: 'Nest Bank',
  description: 'Our reliable microservice-based banking system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}