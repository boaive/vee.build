import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type SubmitEvent } from 'react';
import { partnerTypes } from '../../data/partnership';
import { projectCategories } from '../../data/site';
import { onEnquiry, type PrefillBuild } from './prefill';
import { turnstileToken, useTurnstile } from './turnstile';

type Variant = 'contact' | 'partnership';
type Status = { state: 'idle' | 'sending' | 'sent' | 'error'; message?: string };

interface Props {
  variant?: Variant;
  /** Preselected category (contact) or partner type (partnership). */
  preset?: string;
}

/**
 * The site's own API (admin/api, the same Worker that serves the site), which
 * stores the enquiry for the admin panel and emails the owner. Another
 * endpoint can be set with PUBLIC_ENQUIRY_ENDPOINT.
 */
const ENDPOINT = (import.meta.env.PUBLIC_ENQUIRY_ENDPOINT as string | undefined)?.trim() || '/api/enquiries';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const copy = {
  contact: {
    choiceLabel: 'Project category',
    choices: projectCategories as readonly string[],
    messageLabel: 'Message / site location details',
    messageHint: 'What you want to build, where, and roughly when.',
    submit: 'Initiate build',
  },
  partnership: {
    choiceLabel: 'I am a',
    choices: partnerTypes as readonly string[],
    messageLabel: 'About your operation',
    messageHint: 'Region, capacity, and the kind of work you do today.',
    submit: 'Send partnership enquiry',
  },
} satisfies Record<Variant, unknown>;

export default function EnquiryForm({ variant = 'contact', preset }: Props) {
  const c = copy[variant];
  const uid = useId();
  const form = useRef<HTMLFormElement>(null);
  const statusEl = useRef<HTMLParagraphElement>(null);
  const check = useRef<HTMLDivElement>(null);
  const [choice, setChoice] = useState(preset ?? '');
  const [message, setMessage] = useState('');
  const [build, setBuild] = useState<PrefillBuild | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  // Cloudflare Turnstile: shows nothing unless it needs the visitor to tick a box.
  const turnstile = useTurnstile(check);

  // Prefill from elsewhere on the page (the catalogue's enquire buttons, the configurator's quote).
  useEffect(() => {
    if (variant !== 'contact') return;
    return onEnquiry((d) => {
      if (d.category) setChoice(d.category);
      const line = d.message;
      if (line) setMessage((m) => (m.trim() && !m.startsWith('Model ') && !m.startsWith('My configuration') ? m : line));
      setBuild(d.build ?? null);
    });
  }, [variant]);

  const validate = (data: FormData) => {
    const e: Record<string, string> = {};
    if (!String(data.get('name') ?? '').trim()) e.name = 'Enter your name.';
    const email = String(data.get('email') ?? '').trim();
    if (!email) e.email = 'Enter your email address.';
    else if (!EMAIL.test(email)) e.email = 'Enter a valid email address, like name@example.com.';
    if (!choice) e.choice = variant === 'contact' ? 'Choose a project category.' : 'Choose the option that describes you.';
    if (!message.trim()) e.message = 'Add a few details so we can respond usefully.';
    return e;
  };

  const onSubmit = async (ev: SubmitEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (status.state === 'sending') return;
    const data = new FormData(ev.currentTarget);

    const found = validate(data);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      setStatus({ state: 'error', message: 'Please check the highlighted fields.' });
      form.current?.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] textarea`)?.focus();
      return;
    }

    const payload: Record<string, unknown> = {
      form: variant,
      name: String(data.get('name')).trim(),
      email: String(data.get('email')).trim(),
      [variant === 'contact' ? 'category' : 'partnerType']: choice,
      message: message.trim(),
      page: window.location.href,
      // The honeypot goes to the server, which keeps nothing a bot sends.
      company_website: String(data.get('company_website') ?? ''),
    };
    for (const k of ['phone', 'organisation', 'region']) {
      const v = String(data.get(k) ?? '').trim();
      if (v) payload[k] = v;
    }
    if (build && variant === 'contact') payload.build = build;

    setStatus({ state: 'sending' });
    try {
      payload.turnstileToken = await turnstileToken(turnstile);
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; fields?: Record<string, string> } | null;
        const fields = body?.fields ?? {};
        setErrors(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k === 'category' || k === 'partnerType' ? 'choice' : k, v])));
        throw new Error(body?.error ?? 'The enquiry could not be sent. Please try again.');
      }
      setStatus({ state: 'sent', message: `Thank you, ${payload.name}. Your enquiry has been sent.` });
      form.current?.reset();
      setMessage('');
      setBuild(null);
      setChoice(preset ?? '');
    } catch (e) {
      const msg = e instanceof TypeError ? 'The enquiry could not be sent. Check your connection and try again.' : e instanceof Error ? e.message : 'The enquiry could not be sent.';
      setStatus({ state: 'error', message: msg });
    } finally {
      turnstile.current?.reset();
    }
  };

  useEffect(() => {
    if (status.state === 'sent') statusEl.current?.focus();
  }, [status.state]);

  const field = (name: string, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}, optional = false) => (
    <div className={`field${errors[name] ? ' has-error' : ''}`} data-field={name}>
      <label htmlFor={`${uid}-${name}`}>
        {label}
        {optional && <span className="field__opt">Optional</span>}
      </label>
      <input
        id={`${uid}-${name}`}
        name={name}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${uid}-${name}-err` : undefined}
        {...props}
      />
      {errors[name] && (
        <p className="field__err" id={`${uid}-${name}-err`}>
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form className={`form form--${variant}`} ref={form} onSubmit={onSubmit} noValidate>
      <div className="form__row">
        {field('name', 'Name', { type: 'text', autoComplete: 'name', required: true })}
        {field('email', 'Email address', { type: 'email', autoComplete: 'email', inputMode: 'email', required: true })}
      </div>

      {variant === 'partnership' && (
        <div className="form__row">
          {field('organisation', 'Company / organisation', { type: 'text', autoComplete: 'organization' }, true)}
          {field('phone', 'Phone', { type: 'tel', autoComplete: 'tel', inputMode: 'tel' }, true)}
        </div>
      )}

      <fieldset className={`field field--choice${errors.choice ? ' has-error' : ''}`} data-field="choice">
        <legend>{c.choiceLabel}</legend>
        <div className="choice">
          {c.choices.map((opt) => (
            <label key={opt} className="choice__opt">
              <input
                type="radio"
                name={variant === 'contact' ? 'category' : 'partnerType'}
                value={opt}
                checked={choice === opt}
                onChange={() => setChoice(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        {errors.choice && <p className="field__err">{errors.choice}</p>}
      </fieldset>

      {variant === 'partnership' && field('region', 'Region you operate in', { type: 'text', autoComplete: 'address-level1' }, true)}

      <div className={`field${errors.message ? ' has-error' : ''}`} data-field="message">
        <label htmlFor={`${uid}-message`}>{c.messageLabel}</label>
        <textarea
          id={`${uid}-message`}
          name="message"
          rows={4}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={`${uid}-message-hint${errors.message ? ` ${uid}-message-err` : ''}`}
        />
        <p className="field__hint" id={`${uid}-message-hint`}>
          {c.messageHint}
        </p>
        {errors.message && (
          <p className="field__err" id={`${uid}-message-err`}>
            {errors.message}
          </p>
        )}
      </div>

      <div className="form__trap" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="form__check" ref={check} />

      <div className="form__foot">
        <button type="submit" className="btn btn--light form__submit" disabled={status.state === 'sending'}>
          {status.state === 'sending' ? 'Sending' : c.submit}
        </button>
        <p className={`form__status is-${status.state}`} role="status" aria-live="polite" tabIndex={-1} ref={statusEl}>
          {status.message}
        </p>
      </div>
    </form>
  );
}
