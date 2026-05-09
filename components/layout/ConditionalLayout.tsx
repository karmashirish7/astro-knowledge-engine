'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const AUTH_PATHS = ['/login', '/signup']

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  if (AUTH_PATHS.includes(path)) {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </>
  )
}
