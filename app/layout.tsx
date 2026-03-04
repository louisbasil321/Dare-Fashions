import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { BotIdClient } from 'botid/client';
import LegacyCSSSupport from '@/components/LegacySupport'

import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const protectedRoutes = [
  // Add the pages that call your protected server actions
  // For basket actions (createBasket, updateBasketItem, etc.), this is usually the shop page
  { path: '/shop', method: 'POST' },
  // If you have a dedicated product page, add it too
  { path: '/product/*', method: 'POST' }, // wildcard for dynamic product routes
  // Add any other pages that trigger server actions
  { path: '/baskets', method: 'POST' },
  { path: '/login', method: 'POST' },
];
export const metadata: Metadata = {
  title: 'RP Apparels',
  description: 'Premium fashion for the modern individual',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    
    <html lang="en" suppressHydrationWarning>
      <head>
         <BotIdClient protect={protectedRoutes} />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
       
      </body>
      <LegacyCSSSupport />
    </html>
  )
}