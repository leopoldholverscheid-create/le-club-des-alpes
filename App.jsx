/**
 * Le Club des Alpes — Private Invitation (Vol. 30)
 *
 * Stack: React · Vite · Tailwind CSS · Framer Motion · Supabase · lucide-react
 *
 * ── .env.local ───────────────────────────────────────────────────────────────
 *   VITE_SUPABASE_URL=https://<your-project>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
 *
 * ── Supabase SQL (run once in the SQL editor) ────────────────────────────────
 *   create table if not exists public.rsvps (
 *     id          uuid primary key default gen_random_uuid(),
 *     guest_name  text not null,
 *     status      text not null check (status in ('confirmed', 'declined')),
 *     created_at  timestamptz not null default now()
 *   );
 *
 *   alter table public.rsvps enable row level security;
 *
 *   create policy "Guests can submit RSVPs"
 *     on public.rsvps for insert to anon
 *     with check (status in ('confirmed', 'declined'));
 *
 *   -- Deliberately no SELECT policy: guests can write, but nobody can read the
 *   -- guest list with the public anon key. Latest answer per guest (dashboard):
 *   --   select distinct on (guest_name) guest_name, status, created_at
 *   --   from public.rsvps order by guest_name, created_at desc;
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useAnimationControls,
} from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { ArrowRight, Check, Copy, Loader2, Wallet } from 'lucide-react';

/* ───────────────────────────── Supabase client ───────────────────────────── */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

if (!supabase) {
  console.warn(
    '[Le Club des Alpes] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — RSVPs cannot be saved.'
  );
}

async function saveRsvp(guestName, status) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase
    .from('rsvps')
    .insert({ guest_name: guestName, status });
  if (error) throw error;
}

/* ──────────────────────────────── Config ─────────────────────────────────── */

const GUESTS = [
  'lyn', 'poldi', 'freddy', 'victoria', 'matteo', 'tamara', 'luka', 'nici',
  'matilda', 'emirhan', 'hanna', 'tobi', 'niklas', 'max', 'christin', 'eyk',
  'luis', 'denise', 'cornelius', 'alina', 'leonie', 'corinna', 'alex',
  'marlies', 'enna', 'ralf', 'birgit',
];

const MAPS_URL = 'https://maps.app.goo.gl/ALpBfsoryntMojt27';
const IBAN = 'DE44 6905 0001 0020 1306 21';
const SUMMIT_PASS_URL = '#'; // TODO: replace with your .pkpass endpoint
const MIN_LOADING_MS = 1400; // keeps the spinner on screen long enough to feel deliberate

const EASE = [0.22, 1, 0.36, 1]; // slow, cinematic ease-out

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const PRIMARY_BUTTON =
  'flex min-h-14 w-full items-center justify-center gap-3 bg-zinc-100 px-5 py-4 text-center font-body text-[11px] font-medium uppercase leading-relaxed tracking-[0.16em] text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_18px_40px_-20px_rgba(214,180,132,0.45)] transition-[transform,background-color] duration-300 hover:bg-white active:scale-95 disabled:cursor-wait';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const toDisplayName = (key) => key.charAt(0).toUpperCase() + key.slice(1);

/* ─────────────────────────────── Atmosphere ──────────────────────────────── */

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500&display=swap');
      html, body { margin: 0; background-color: #09090b; }
      body { -webkit-tap-highlight-color: transparent; }
      .font-display { font-family: 'Cormorant Garamond', ui-serif, Georgia, serif; }
      .font-body { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; }
    `}</style>
  );
}

/** Matte leather / suede: warm ambient light from above, soft edge falloff, fine grain. */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -8%, rgba(214,180,132,0.14) 0%, rgba(214,180,132,0.045) 42%, transparent 72%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.6) 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{ backgroundImage: NOISE, backgroundSize: '240px 240px' }}
      />
    </div>
  );
}

/* ──────────────────────────────── Primitives ─────────────────────────────── */

function Label({ children, className = '' }) {
  return (
    <p
      className={`font-body text-[10px] font-medium uppercase tracking-[0.32em] text-zinc-500 ${className}`}
    >
      {children}
    </p>
  );
}

function Reveal({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1.3, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function Section({ label, children }) {
  return (
    <Reveal className="py-10">
      <Label className="text-[#b9a47f]">{label}</Label>
      <div className="mt-4 space-y-3 font-body text-[15px] font-light leading-relaxed text-zinc-400">
        {children}
      </div>
    </Reveal>
  );
}

/* ─────────────────────────── State 1: Name Gate ──────────────────────────── */

function NameGate({ onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const shake = useAnimationControls();

  const handleSubmit = (event) => {
    event.preventDefault();
    const key = value.trim().toLowerCase();
    if (!key) return;

    if (GUESTS.includes(key)) {
      document.activeElement?.blur(); // dismiss the iOS keyboard before the transition
      onUnlock(toDisplayName(key));
      return;
    }

    setError(true);
    shake.start({
      x: [0, -10, 9, -6, 4, 0],
      transition: { duration: 0.5, ease: 'easeInOut' },
    });
  };

  return (
    <motion.section
      className="flex flex-1 flex-col items-center justify-center px-8 py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 1.8, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: 0.9, ease: EASE } }}
    >
      <motion.div
        aria-hidden="true"
        className="mb-14 h-12 w-px bg-gradient-to-b from-transparent to-zinc-600"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
        style={{ originY: 0 }}
      />

      <form onSubmit={handleSubmit} noValidate className="w-full">
        <motion.label
          htmlFor="guest-name"
          className="block text-center font-body text-[10px] font-medium uppercase leading-loose tracking-[0.35em] text-zinc-500"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.5 }}
        >
          ENTER YOUR FIRST NAME TO UNLOCK INVITATION
        </motion.label>

        <motion.div animate={shake} className="relative mt-10">
          <input
            id="guest-name"
            name="guest-name"
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(false);
            }}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="go"
            aria-invalid={error}
            aria-describedby={error ? 'gate-error' : undefined}
            className="peer block h-14 w-full rounded-none border-0 bg-transparent text-center font-display text-3xl text-zinc-200 caret-[#c9b48f] outline-none"
          />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-zinc-800" />
          <span
            aria-hidden="true"
            className={`absolute inset-x-0 bottom-0 h-px origin-center scale-x-0 transition-transform duration-700 ease-out peer-focus:scale-x-100 ${
              error ? 'bg-[#b98a7e]' : 'bg-zinc-400'
            }`}
          />
        </motion.div>

        <div className="mt-5 min-h-5" aria-live="polite">
          <AnimatePresence>
            {error && (
              <motion.p
                id="gate-error"
                className="text-center font-body text-xs tracking-wide text-[#b98a7e]"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                Allocation not found. Please check your spelling.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="submit"
          disabled={!value.trim()}
          className="mx-auto mt-6 flex min-h-12 items-center gap-3 px-6 font-body text-[10px] font-medium uppercase tracking-[0.35em] text-zinc-300 transition-[transform,opacity] duration-300 active:scale-95 disabled:opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.8 }}
        >
          Unlock
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </motion.button>
      </form>
    </motion.section>
  );
}

/* ─────────────────────────── State 2: The Manifest ───────────────────────── */

function TopBar() {
  return (
    <header
      className="sticky top-0 z-20 border-b border-white/[0.06] bg-zinc-950/75 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-12 items-center justify-between gap-4 whitespace-nowrap px-5 font-body text-[9px] font-medium uppercase tracking-[0.14em] min-[400px]:tracking-[0.24em]">
        <span className="text-zinc-300">LE CLUB DES ALPES</span>
        <span className="flex items-center gap-2 text-zinc-500">
          <span className="relative hidden h-1.5 w-1.5 min-[400px]:flex">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#c9b48f]/50" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#c9b48f]" />
          </span>
          CAPACITY: LIMITED ACCESS
        </span>
      </div>
    </header>
  );
}

function CopyIban() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(IBAN.replace(/\s/g, ''));
      setCopied(true);
    } catch {
      // Clipboard unavailable (e.g. in-app browser) — the IBAN stays selectable.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy IBAN"
      className="-mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center justify-between gap-3 px-2 text-left transition-transform duration-300 active:scale-[0.98]"
    >
      <span className="select-text">
        IBAN: <span className="whitespace-nowrap tabular-nums">{IBAN}</span>
      </span>
      <span className="relative h-4 w-4 shrink-0 text-zinc-500">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? 'check' : 'copy'}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.25 }}
          >
            {copied ? (
              <Check className="h-4 w-4 text-[#c9b48f]" strokeWidth={1.5} />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={1.5} />
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'IBAN copied' : ''}
      </span>
    </button>
  );
}

function RsvpPanel({ name }) {
  // idle → confirming → confirmed   |   idle → declining → declined
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const busy = phase === 'confirming' || phase === 'declining';

  const respond = async (status, pendingPhase, donePhase) => {
    if (busy) return;
    setError('');
    setPhase(pendingPhase);
    try {
      await Promise.all([saveRsvp(name, status), wait(MIN_LOADING_MS)]);
      setPhase(donePhase);
    } catch (err) {
      console.error('[RSVP]', err);
      setPhase('idle');
      setError('Connection interrupted. Please try again.');
    }
  };

  return (
    <div className="mt-8">
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'declined' ? (
          <motion.div
            key="released"
            className="border-y border-white/[0.07] py-8 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: EASE }}
            role="status"
          >
            <p className="font-display text-xl italic leading-snug text-zinc-300">
              Allocation released. We will miss you at the altitude.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.6, ease: EASE } }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {phase === 'confirmed' ? (
                <motion.a
                  key="pass"
                  href={SUMMIT_PASS_URL}
                  onClick={(event) => {
                    if (SUMMIT_PASS_URL === '#') event.preventDefault();
                  }}
                  className={PRIMARY_BUTTON}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.9, ease: EASE }}
                >
                  <Wallet className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span>ADD SUMMIT PASS TO APPLE WALLET (.PKPASS)</span>
                </motion.a>
              ) : (
                <motion.button
                  key="confirm"
                  type="button"
                  onClick={() => respond('confirmed', 'confirming', 'confirmed')}
                  disabled={busy}
                  aria-busy={phase === 'confirming'}
                  className={PRIMARY_BUTTON}
                  exit={{ opacity: 0, transition: { duration: 0.4 } }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {phase === 'confirming' ? (
                      <motion.span
                        key="loading"
                        className="flex items-center gap-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                      >
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                        Securing allocation...
                      </motion.span>
                    ) : (
                      <motion.span
                        key="cta"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                      >
                        CONFIRM ATTENDANCE &amp; GET SUMMIT PASS
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}
            </AnimatePresence>

            {phase === 'confirmed' ? (
              <motion.p
                className="mt-5 text-center font-body text-[10px] font-medium uppercase tracking-[0.32em] text-[#c9b48f]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, ease: EASE, delay: 0.4 }}
                role="status"
              >
                STATUS: ALLOCATION SECURED
              </motion.p>
            ) : (
              <button
                type="button"
                onClick={() => respond('declined', 'declining', 'declined')}
                disabled={busy}
                className="mx-auto mt-3 flex min-h-12 items-center justify-center gap-2 px-4 font-body text-xs text-zinc-500 underline decoration-zinc-700 underline-offset-4 transition-[transform,opacity] duration-300 active:scale-95 disabled:opacity-40"
              >
                {phase === 'declining' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    Releasing allocation...
                  </>
                ) : (
                  'Unable to attend? Release allocation.'
                )}
              </button>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  role="alert"
                  className="mt-1 text-center font-body text-xs text-[#b98a7e]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Manifest({ name }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={{ opacity: 0, y: 56 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.5, ease: EASE, delay: 0.15 }}
    >
      <TopBar />

      <main className="flex-1 px-6 pb-4 pt-14">
        {/* Personalized greeting */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.6 }}
        >
          <h1 className="font-display text-[2.6rem] font-normal leading-[1.05] text-zinc-200">
            Welcome, {name}.
          </h1>
          <p className="mt-4 flex items-center gap-2.5 font-body text-[10px] font-medium uppercase tracking-[0.32em] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c9b48f]" />
            STATUS: ALLOCATION UNLOCKED
          </p>
        </motion.header>

        {/* Masthead */}
        <Reveal className="mt-14 border-y border-white/[0.07] py-10 text-center" delay={0.9}>
          <h2 className="text-balance font-display text-[1.7rem] font-normal uppercase leading-tight tracking-[0.14em] text-zinc-200">
            LE CLUB DES ALPES
          </h2>
          <p className="mt-3 font-display text-lg italic text-zinc-400">
            Vol. 30 — Private Gathering
          </p>
        </Reveal>

        <div className="divide-y divide-white/[0.06]">
          <Section label="THE OCCASION">
            <p className="font-display text-[1.75rem] leading-snug text-zinc-200">
              30 Years. One Alpine Night.
            </p>
          </Section>

          <Section label="THE LOCATION">
            <p>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 text-zinc-200 underline decoration-zinc-600 underline-offset-4 transition-colors hover:decoration-zinc-300"
              >
                The Shelter (TC Kluftern)
              </a>
              . Kluftern, Germany.
            </p>
            <p>December 12, 2026 — 18:00 Hours till Late (Open End).</p>
          </Section>

          <Section label="THE ATMOSPHERE">
            <p>
              Raw alpine conditions meet indoor fireside. We are curating an authentic
              high-altitude environment. The venue is intentionally kept at lower
              temperatures to simulate a true mountain shelter.
            </p>
          </Section>

          <Section label="CUISINE & SPIRITS">
            <p>
              Refined mountain gastronomy. Elevated alpine fare, curated spirits, and warm
              après-ski classics served throughout the night.
            </p>
          </Section>

          <Section label="DRESS CODE">
            <p className="font-display text-xl leading-snug text-zinc-200">
              Alpine Elegance. Cashmere, Heavy Knits, Shearling.
            </p>
            <p>
              Dress for the mountains, not the valley. Functional warmth is a mandatory
              part of the aesthetic.
            </p>
          </Section>

          <Section label="GIFTS & TRIBUTES">
            <p>
              Your presence at the altitude is the only gift required. Should you wish to
              honor the occasion, we invite you to make a contribution to our local
              tennis sanctuary:
            </p>
            <div className="!mt-6 border border-white/[0.08] bg-white/[0.02] px-5 py-4">
              <p className="font-display text-xl text-zinc-200">TC Kluftern</p>
              <CopyIban />
              <p>Reference: Spende</p>
              <p className="mt-3 text-xs text-zinc-500">
                (Note: Eligible for tax deduction in your 2026 tax return.)
              </p>
            </div>
          </Section>

          <Section label="RSVP & ALLOCATION">
            <p>
              Confirm your attendance below to secure your allocation and generate your
              personal Summit Pass.
            </p>
            <RsvpPanel name={name} />
          </Section>
        </div>
      </main>
    </motion.div>
  );
}

/* ──────────────────────────────── Footer ─────────────────────────────────── */

/** In-app browsers (Instagram, WhatsApp…) can misbehave. On iOS 17+ the
 *  x-safari- scheme hands the current URL straight to Safari. */
function Footer() {
  const { href, isIOS } = useMemo(() => {
    const url = window.location.href;
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return { href: ios ? `x-safari-${url}` : url, isIOS: ios };
  }, []);

  return (
    <motion.footer
      className="px-6 pt-6 text-center"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.6, ease: EASE, delay: 1.2 }}
    >
      <a
        href={href}
        {...(!isIOS && { target: '_blank', rel: 'noopener noreferrer' })}
        className="inline-flex min-h-12 items-center font-body text-[11px] text-zinc-600 transition-[transform,color] duration-300 hover:text-zinc-400 active:scale-95"
      >
        Having trouble? Tap here to open in Safari.
      </a>
    </motion.footer>
  );
}

/* ───────────────────────────────── App ───────────────────────────────────── */

export default function App() {
  const [guest, setGuest] = useState(null);

  return (
    <MotionConfig reducedMotion="user">
      <GlobalStyles />
      <div className="relative min-h-[100dvh] overflow-x-clip bg-zinc-950 font-body text-zinc-400 antialiased selection:bg-zinc-300 selection:text-zinc-950">
        <Backdrop />
        <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
          <AnimatePresence mode="wait">
            {guest ? (
              <Manifest key="manifest" name={guest} />
            ) : (
              <NameGate key="gate" onUnlock={setGuest} />
            )}
          </AnimatePresence>
          <Footer />
        </div>
      </div>
    </MotionConfig>
  );
}
