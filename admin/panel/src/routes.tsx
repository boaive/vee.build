import { Navigate, Outlet, createBrowserRouter, useLocation } from 'react-router';
import { LoadingRows } from '@/components/states/States';
import { useMe } from '@/api/hooks';
import { AppShell } from '@/layouts/AppShell';
import EnquiriesPage from '@/pages/EnquiriesPage';
import EnquiryPage from '@/pages/EnquiryPage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import OverviewPage from '@/pages/OverviewPage';
import PricesPage from '@/pages/PricesPage';
import QuotePage from '@/pages/QuotePage';
import QuotePrintPage from '@/pages/QuotePrintPage';
import QuotesPage from '@/pages/QuotesPage';
import SettingsPage from '@/pages/SettingsPage';

/** Sends a visitor without a sign-in to the login screen. The server checks the sign-in again on every request. */
function RequireAuth({ shell = true }: { shell?: boolean }) {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) {
    return (
      <div className="mx-auto max-w-md p-10">
        <LoadingRows rows={3} />
      </div>
    );
  }
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return shell ? <AppShell /> : <Outlet />;
}

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    // The printable quote: signed in, without the panel around it.
    { element: <RequireAuth shell={false} />, children: [{ path: '/quotes/:id/print', element: <QuotePrintPage /> }] },
    {
      element: <RequireAuth />,
      children: [
        { index: true, element: <OverviewPage /> },
        { path: 'enquiries', element: <EnquiriesPage /> },
        { path: 'enquiries/:id', element: <EnquiryPage /> },
        { path: 'quotes', element: <QuotesPage /> },
        { path: 'quotes/new', element: <QuotePage /> },
        { path: 'quotes/:id', element: <QuotePage /> },
        { path: 'prices', element: <PricesPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: '/admin' },
);
