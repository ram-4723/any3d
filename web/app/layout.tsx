import type { Metadata } from 'next';
import './globals.css';
import { getObjects } from '@/lib/objects';
import { Header } from '@/components/Site';
export const metadata: Metadata = { title: '3D Anything — The world, in every dimension.', description: 'Spin it. Study it. Discover the details that make everything fascinating.' };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const objects = await getObjects(); return <html lang="en"><body><Header objects={objects}/>{children}</body></html>; }
