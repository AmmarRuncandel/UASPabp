'use client';

import { useState, useId } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthScreenProps {
  onLogin: () => void;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode]           = useState<'login' | 'register'>('login');
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const uid = useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    // Simulate async login
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1100);
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--color-base)' }}
    >
      {/* Background glow accents */}
      <div
        className="absolute pointer-events-none"
        style={{ width: 600, height: 600, top: '-20%', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(252,213,53,0.07) 0%, transparent 65%)', borderRadius: '50%' }}
        aria-hidden="true"
      />
      <div
        className="absolute pointer-events-none"
        style={{ width: 400, height: 400, bottom: '-10%', right: '-5%', background: 'radial-gradient(circle, rgba(30,50,80,0.5) 0%, transparent 65%)', borderRadius: '50%' }}
        aria-hidden="true"
      />

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="glass rounded-2xl w-full max-w-sm overflow-hidden"
        role="main"
      >
        {/* Header */}
        <div
          className="px-8 pt-10 pb-8 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(252,213,53,0.06) 0%, transparent 60%)' }}
        >
          {/* Logo */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 260 }}
            className="text-4xl font-black tracking-tight mb-1"
            style={{ color: 'var(--color-gold)' }}
          >
            Zmayy
          </motion.h1>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {mode === 'login' ? 'Welcome back 👋' : 'Create your account'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4" noValidate>
          {/* Username */}
          <div>
            <label
              htmlFor={`${uid}-username`}
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--color-muted)' }}
            >
              USERNAME
            </label>
            <input
              id={`${uid}-username`}
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="Enter your username"
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl text-sm transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${error ? '#EF4444' : 'var(--color-border)'}`,
              }}
              aria-required="true"
              aria-invalid={!!error}
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor={`${uid}-password`}
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--color-muted)' }}
            >
              PASSWORD
            </label>
            <div className="relative">
              <input
                id={`${uid}-password`}
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 pr-11 rounded-xl text-sm transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${error ? '#EF4444' : 'var(--color-border)'}`,
                }}
                aria-required="true"
                aria-invalid={!!error}
              />
              <button
                id={`${uid}-toggle-pwd`}
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--color-muted)' }}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs"
              style={{ color: '#EF4444' }}
              role="alert"
            >
              {error}
            </motion.p>
          )}

          {/* Submit */}
          <motion.button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {mode === 'login' ? 'Logging in…' : 'Creating account…'}
              </>
            ) : (
              mode === 'login' ? 'Login' : 'Create Account'
            )}
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          {/* Mode switch */}
          <p className="text-center text-sm" style={{ color: 'var(--color-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              id="auth-mode-switch"
              type="button"
              onClick={() => { setMode((m) => m === 'login' ? 'register' : 'login'); setError(''); }}
              className="font-semibold hover:underline"
              style={{ color: 'var(--color-gold)' }}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
