import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { toast } from 'sonner';
import { SIGNED_OUT } from '@/api';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/theme';
import { router } from '@/routes';
import './styles/index.css';

const queryClient = new QueryClient({
  // One place reports a failed change; a screen that shows the error by the field marks its mutation `silent`.
  mutationCache: new MutationCache({
    onError: (error, _v, _c, mutation) => {
      if (!mutation.meta?.silent) toast.error(error instanceof Error ? error.message : 'The change could not be saved.');
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: (count, error) => count < 2 && (error as { retryable?: boolean }).retryable === true,
      refetchOnWindowFocus: true,
    },
  },
});

// A request that finds the sign-in has ended sends the panel back to the login screen.
window.addEventListener(SIGNED_OUT, () => {
  if (queryClient.getQueryData(['me'])) toast.info('Your sign-in has ended. Please sign in again.');
  queryClient.setQueryData(['me'], null);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
