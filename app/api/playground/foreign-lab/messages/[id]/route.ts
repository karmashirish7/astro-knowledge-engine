import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const message = await prisma.dashaLabMessage.findUnique({ where: { id }, include: { thread: { select: { userId: true } } } })
  if (!message || message.thread.userId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const updated = await prisma.dashaLabMessage.update({
    where: { id },
    data: { ruleSaved: body.ruleSaved === true },
  })
  return NextResponse.json(updated)
}
