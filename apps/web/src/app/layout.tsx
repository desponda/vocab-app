import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TestCraft AI - Craft Perfect Practice Tests in Seconds',
  description: 'Upload photos of worksheets or study guides. Our AI generates customized spelling, vocabulary, and knowledge tests with auto-grading for K-12 classrooms.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" expand={true} richColors />
      </body>
    </html>
  );
}
