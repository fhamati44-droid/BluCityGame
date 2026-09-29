import type { Metadata } from 'next';
import './styles.css';
export const metadata: Metadata = { title: 'BLU | City of Energy', description: 'Charge BLU. Light the city.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><head><script src="https://telegram.org/js/telegram-web-app.js" defer /></head><body>{children}</body></html>; }
