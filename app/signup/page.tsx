'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { User, Mail, Lock, AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm]   = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create account')
        return
      }

      // Auto sign-in after signup
      const login = await signIn('credentials', {
        email:    form.email.toLowerCase(),
        password: form.password,
        redirect: false,
      })
      if (login?.error) {
        router.push('/login')
      } else {
        router.push('/')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const field = (
    key: keyof typeof form,
    label: string,
    type: string,
    placeholder: string,
    Icon: React.ElementType,
    autoComplete: string,
  ) => (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--text-muted)' }}>{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--text-muted)' }} />
        <input
          type={type} required autoComplete={autoComplete}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm outline-none transition-all"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)' }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Akashvani Engine" width={180} height={180} className="object-contain mb-2" unoptimized />
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Create your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <form onSubmit={submit} className="space-y-4">
            {field('name',     'Full Name', 'text',     'Your name',       User, 'name')}
            {field('email',    'Email',     'email',    'you@example.com', Mail, 'email')}
            {field('password', 'Password',  'password', '••••••••',        Lock, 'new-password')}
            {field('confirm',  'Confirm Password', 'password', '••••••••', Lock, 'new-password')}

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
                style={{ background: '#EF444415', border: '1px solid #EF444433', color: '#EF4444' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold transition-opacity"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#7C3AED' }}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
