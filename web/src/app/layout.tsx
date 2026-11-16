import '@/styles/global.css';
import ReactQueryProvider from '@/components/providers/ReactQueryProvider';
import ToastProvider from '@/components/notifications/ToastProvider';
import { AuthProvider } from '@/contexts/auth-context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ReactQueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </ReactQueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
