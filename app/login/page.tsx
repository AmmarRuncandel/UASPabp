'use client';

/**
 * Halaman Login Zmayy — Autentikasi Supabase
 * ─────────────────────────────────────────────
 * • Slide horizontal AnimatePresence antara mode login/daftar
 * • Setelah daftar berhasil: otomatis pindah ke login, email & kata sandi terisi
 * • Pesan error Supabase ditampilkan jelas di atas tombol submit
 * • Semua teks dalam Bahasa Indonesia
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// ── Terjemahan pesan error Supabase ke Bahasa Indonesia ──────────────────────
function translateError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid password'))
    return 'Email atau kata sandi salah. Periksa kembali dan coba lagi.';
  if (msg.includes('user already registered') || msg.includes('already been registered'))
    return 'Email ini sudah terdaftar. Silakan masuk.';
  if (msg.includes('email not confirmed'))
    return 'Email belum diverifikasi. Periksa kotak masuk kamu.';
  if (msg.includes('rate limit') || msg.includes('too many requests'))
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  if (msg.includes('password should be at least'))
    return 'Kata sandi minimal 6 karakter.';
  if (msg.includes('unable to validate email') || msg.includes('invalid email'))
    return 'Format email tidak valid.';
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Koneksi gagal. Periksa jaringan internet kamu.';
  return raw; // fallback: tampilkan pesan asli
}

// ── Slide variants ─────────────────────────────────────────────────────────────
const variants = {
  enterFromRight: { x: '60px',  opacity: 0 },
  enterFromLeft:  { x: '-60px', opacity: 0 },
  center:         { x: 0,       opacity: 1 },
  exitToRight:    { x: '60px',  opacity: 0 },
  exitToLeft:     { x: '-60px', opacity: 0 },
};

type Mode = 'login' | 'signup';

// ── Field component ────────────────────────────────────────────────────────────
function Field({
  id, label, type, value, onChange, placeholder, autoComplete, trailing, hasError,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  trailing?: React.ReactNode;
  hasError?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
        style={{ color: 'var(--color-muted)' }}
      >
        {label}
      </label>
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all focus-within:border-[#FCD535]/60"
        style={{
          background:   'rgba(255,255,255,0.04)',
          borderColor:  hasError ? 'rgba(239,68,68,0.6)' : 'var(--color-border)',
        }}
      >
        <input
          id={id}
          type={type}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-sm bg-transparent"
          style={{ color: 'var(--color-primary)' }}
          aria-invalid={hasError}
        />
        {trailing}
      </div>
    </div>
  );
}

// ── Halaman Utama ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [mode,       setMode]       = useState<Mode>('login');
  const [prevMode,   setPrevMode]   = useState<Mode>('login');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const direction: 'left' | 'right' = prevMode === 'login' && mode === 'signup' ? 'right' : 'left';

  function switchMode(next: Mode) {
    setPrevMode(mode);
    setMode(next);
    setError(null);
    setSuccessMsg(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Otomatis pindah ke login; email & kata sandi tetap terisi
        setSuccessMsg('Akun berhasil dibuat. Silakan masuk.');
        setPrevMode('signup');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Autentikasi gagal.';
      setError(translateError(raw));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--color-base)' }}
    >
      {/* Ambient glow atas */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -10%, rgba(252,213,53,0.1) 0%, transparent 65%)' }}
        aria-hidden="true"
      />
      {/* Ambient glow bawah */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 80% 90%, rgba(30,50,80,0.45) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Kartu — ukuran tetap, panel geser di dalamnya */}
      <div className="glass rounded-2xl w-full max-w-sm overflow-hidden relative">

        {/* Header logo — tidak ikut geser */}
        <div
          className="px-8 pt-10 pb-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(252,213,53,0.07) 0%, transparent 60%)' }}
        >
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-4"
            style={{ background: '#FCD535', color: '#0B0E11', boxShadow: '0 0 32px rgba(252,213,53,0.35)' }}
            whileHover={{ scale: 1.05 }}
            aria-hidden="true"
          >
            Z
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>
            Zmayy
          </h1>

          {/* Subtitle bergeser */}
          <AnimatePresence mode="wait">
            <motion.p
              key={mode + '-sub'}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-sm mt-1"
              style={{ color: 'var(--color-muted)' }}
            >
              {mode === 'login' ? 'Masuk ke petamu' : 'Buat akun baru'}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Panel formulir geser horizontal */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.form
              key={mode}
              initial={direction === 'right' ? variants.enterFromRight : variants.enterFromLeft}
              animate={variants.center}
              exit={direction === 'right'  ? variants.exitToLeft     : variants.exitToRight}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onSubmit={handleSubmit}
              className="px-8 pb-8 space-y-4"
              noValidate
            >
              {/* Banner sukses setelah daftar */}
              <AnimatePresence>
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs px-3 py-2.5 rounded-lg overflow-hidden"
                    style={{ background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)', color: '#2ECC71' }}
                    role="status"
                  >
                    {successMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <Field
                id="auth-email"
                label="Email"
                type="email"
                value={email}
                onChange={(v) => { setEmail(v); setError(null); }}
                placeholder="nama@contoh.com"
                autoComplete="email"
                hasError={!!error}
              />

              <Field
                id="auth-password"
                label="Kata Sandi"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(v) => { setPassword(v); setError(null); }}
                placeholder={mode === 'signup' ? 'Minimal 6 karakter' : '••••••••'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                hasError={!!error}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    style={{ color: 'var(--color-muted)', flexShrink: 0 }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              {/* ── Error message — ditampilkan tepat di atas tombol submit ── */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0   }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-2 text-xs px-3 py-2.5 rounded-lg"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border:     '1px solid rgba(239,68,68,0.3)',
                      color:      '#EF4444',
                    }}
                    role="alert"
                    aria-live="assertive"
                  >
                    <AlertCircle size={13} className="flex-shrink-0 mt-px" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tombol submit */}
              <motion.button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{
                  background:  '#FCD535',
                  color:       '#0B0E11',
                  boxShadow:   '0 4px 20px rgba(252,213,53,0.28)',
                  opacity:     loading ? 0.75 : 1,
                }}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                {mode === 'login' ? 'Masuk' : 'Buat Akun'}
              </motion.button>

              {/* Ganti mode */}
              <p className="text-center text-xs" style={{ color: 'var(--color-muted)' }}>
                {mode === 'login' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
                <button
                  type="button"
                  id="auth-mode-switch"
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="font-semibold hover:underline underline-offset-2"
                  style={{ color: '#FCD535' }}
                >
                  {mode === 'login' ? 'Daftar' : 'Masuk'}
                </button>
              </p>
            </motion.form>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
