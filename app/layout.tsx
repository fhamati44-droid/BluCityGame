import type { Metadata, Viewport } from 'next';
import { Rubik } from 'next/font/google';
import './styles.css';
import './hub.css';

// Rubik covers Latin, Hebrew and Arabic with heavy rounded weights, so all three languages share one game voice.
const rubik = Rubik({ subsets: ['latin', 'hebrew', 'arabic'], weight: ['400', '500', '700', '800', '900'], variable: '--font-rubik', display: 'swap' });
export const metadata: Metadata = { title: 'BLU | City of Energy', description: 'Charge BLU. Light the city.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#4a63ff' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={rubik.variable}><head><script src="https://telegram.org/js/telegram-web-app.js" defer /></head><body>{children}</body></html>; }
