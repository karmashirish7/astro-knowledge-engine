import DashaLabView from '../DashaLabView'

export default async function DashaLabThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  return <DashaLabView key={threadId} threadId={threadId} />
}
