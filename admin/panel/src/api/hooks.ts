import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  EnquiryCounts,
  EnquiryDetail,
  EnquiryListItem,
  EnquiryPatch,
  EnquiryQuery,
  Me,
  Note,
  Overview,
  Page,
  PasswordChange,
  PricingSet,
  PricingState,
  PricingVersion,
  Quote,
  QuoteInput,
  QuoteListItem,
  QuoteStatus,
  SecurityState,
  Settings,
  SettingsState,
  StoredFile,
} from '@shared';
import { api, isApiError } from './client';

const qs = (o: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

/* ---------- Sign-in ---------- */

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api<Me>('GET', '/auth/me');
      } catch (e) {
        if (isApiError(e) && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
  });
}

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { email: string; password: string; turnstileToken: string }) => api<Me>('POST', '/auth/login', v),
    onSuccess: (me) => qc.setQueryData(['me'], me),
    meta: { silent: true },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: true }>('POST', '/auth/logout'),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(['me'], null);
    },
  });
}

/* ---------- Enquiries ---------- */

export const useOverview = () => useQuery({ queryKey: ['overview'], queryFn: () => api<Overview>('GET', '/admin/overview'), refetchInterval: 60_000 });

export const useEnquiries = (q: { status: NonNullable<EnquiryQuery['status']>; q?: string; page: number }) =>
  useQuery({ queryKey: ['enquiries', q], queryFn: () => api<Page<EnquiryListItem>>('GET', `/admin/enquiries${qs({ status: q.status, q: q.q, page: q.page })}`), placeholderData: keepPreviousData });

export const useEnquiryCounts = () => useQuery({ queryKey: ['enquiries', 'counts'], queryFn: () => api<EnquiryCounts>('GET', '/admin/enquiries/counts') });

export const useEnquiry = (id: string) => useQuery({ queryKey: ['enquiry', id], queryFn: () => api<EnquiryDetail>('GET', `/admin/enquiries/${id}`) });

/** After any change to an enquiry, every list and the overview are fetched again. */
function useRefreshEnquiries() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: ['enquiries'] });
    void qc.invalidateQueries({ queryKey: ['overview'] });
    if (id) void qc.invalidateQueries({ queryKey: ['enquiry', id] });
  };
}

export function useUpdateEnquiry(id: string) {
  const refresh = useRefreshEnquiries();
  return useMutation({ mutationFn: (p: EnquiryPatch) => api('PATCH', `/admin/enquiries/${id}`, p), onSuccess: () => refresh(id) });
}

export function useAddNote(id: string) {
  const refresh = useRefreshEnquiries();
  return useMutation({ mutationFn: (body: string) => api<Note>('POST', `/admin/enquiries/${id}/notes`, { body }), onSuccess: () => refresh(id) });
}

export function useDeleteNote(id: string) {
  const refresh = useRefreshEnquiries();
  return useMutation({ mutationFn: (noteId: string) => api('DELETE', `/admin/enquiries/${id}/notes/${noteId}`), onSuccess: () => refresh(id) });
}

export function useDeleteEnquiry() {
  const qc = useQueryClient();
  const refresh = useRefreshEnquiries();
  return useMutation({
    mutationFn: (id: string) => api('DELETE', `/admin/enquiries/${id}`),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: ['enquiry', id] });
      refresh();
      void qc.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useUploadFile(id: string) {
  const refresh = useRefreshEnquiries();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api<StoredFile>('POST', `/admin/enquiries/${id}/files`, form);
    },
    onSuccess: () => refresh(id),
  });
}

export function useDeleteFile(enquiryId: string) {
  const refresh = useRefreshEnquiries();
  return useMutation({ mutationFn: (fileId: string) => api('DELETE', `/admin/files/${fileId}`), onSuccess: () => refresh(enquiryId) });
}

/* ---------- Quotes ---------- */

export const useQuotes = (q: { status?: QuoteStatus; q?: string; page: number }) =>
  useQuery({ queryKey: ['quotes', q], queryFn: () => api<Page<QuoteListItem>>('GET', `/admin/quotes${qs(q)}`), placeholderData: keepPreviousData });

export const useQuote = (id: string | undefined) => useQuery({ queryKey: ['quote', id], queryFn: () => api<Quote>('GET', `/admin/quotes/${id}`), enabled: !!id });

export const useNewQuoteDefaults = (enquiryId: string | null, enabled: boolean) =>
  useQuery({ queryKey: ['quote-defaults', enquiryId], queryFn: () => api<QuoteInput>('GET', `/admin/quotes/new${qs({ enquiryId: enquiryId ?? undefined })}`), enabled, staleTime: Infinity });

function useRefreshQuotes() {
  const qc = useQueryClient();
  return (q: Quote) => {
    qc.setQueryData(['quote', q.id], q);
    void qc.invalidateQueries({ queryKey: ['quotes'] });
    void qc.invalidateQueries({ queryKey: ['overview'] });
    void qc.invalidateQueries({ queryKey: ['enquiries'] });
    if (q.enquiryId) void qc.invalidateQueries({ queryKey: ['enquiry', q.enquiryId] });
  };
}

export function useCreateQuote() {
  const refresh = useRefreshQuotes();
  return useMutation({ mutationFn: (v: QuoteInput) => api<Quote>('POST', '/admin/quotes', v), onSuccess: refresh, meta: { silent: true } });
}

export function useSaveQuote(id: string) {
  const refresh = useRefreshQuotes();
  return useMutation({ mutationFn: (v: QuoteInput) => api<Quote>('PUT', `/admin/quotes/${id}`, v), onSuccess: refresh, meta: { silent: true } });
}

export function useQuoteNotes(id: string) {
  const refresh = useRefreshQuotes();
  return useMutation({ mutationFn: (notes: string) => api<Quote>('PUT', `/admin/quotes/${id}/notes`, { notes }), onSuccess: refresh });
}

export function useQuoteStatus(id: string) {
  const refresh = useRefreshQuotes();
  return useMutation({ mutationFn: (status: QuoteStatus) => api<Quote>('POST', `/admin/quotes/${id}/status`, { status }), onSuccess: refresh });
}

export function useCopyQuote(id: string) {
  const refresh = useRefreshQuotes();
  return useMutation({ mutationFn: () => api<Quote>('POST', `/admin/quotes/${id}/copy`), onSuccess: refresh });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (q: Quote) => api('DELETE', `/admin/quotes/${q.id}`),
    onSuccess: (_r, q) => {
      qc.removeQueries({ queryKey: ['quote', q.id] });
      void qc.invalidateQueries({ queryKey: ['quotes'] });
      if (q.enquiryId) void qc.invalidateQueries({ queryKey: ['enquiry', q.enquiryId] });
    },
  });
}

/* ---------- Prices ---------- */

export const usePricing = () => useQuery({ queryKey: ['pricing'], queryFn: () => api<PricingState>('GET', '/admin/pricing') });

export function usePublishPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { rates: PricingSet; note: string; basedOn: number }) => api<PricingVersion>('POST', '/admin/pricing', v),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['pricing'] }),
    meta: { silent: true },
  });
}

/* ---------- Settings and security ---------- */

export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: () => api<SettingsState>('GET', '/admin/settings') });

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (s: Settings) => api<SettingsState>('PUT', '/admin/settings', s), onSuccess: (r) => qc.setQueryData(['settings'], r), meta: { silent: true } });
}

export const useSecurity = () => useQuery({ queryKey: ['security'], queryFn: () => api<SecurityState>('GET', '/admin/security') });

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: PasswordChange) => api('POST', '/auth/password', v), onSuccess: () => void qc.invalidateQueries({ queryKey: ['security'] }), meta: { silent: true } });
}

export function useSignOutOthers() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api('POST', '/auth/sessions/sign-out-others'), onSuccess: () => void qc.invalidateQueries({ queryKey: ['security'] }) });
}

export function useSignOutDevice() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api('DELETE', `/admin/sessions/${id}`), onSuccess: () => void qc.invalidateQueries({ queryKey: ['security'] }) });
}
