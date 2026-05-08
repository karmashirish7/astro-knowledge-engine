import { prisma } from './db'
import { extractEntities } from './entities'

export async function autoLinkEntry(
  entryId: string,
  title: string,
  description: string,
  tags: string[]
) {
  const text = `${title} ${description} ${tags.join(' ')}`
  const entities = extractEntities(text)
  if (entities.length === 0) return

  for (const entity of entities) {
    const matches = await prisma.knowledgeEntry.findMany({
      where: {
        id: { not: entryId },
        OR: [
          { title: { contains: entity.name } },
          { tags: { contains: entity.name } },
          { description: { contains: entity.name } },
        ],
      },
      take: 10,
    })

    for (const match of matches) {
      // Forward link: entryId → match
      await prisma.entryRelation.upsert({
        where: { fromId_toId: { fromId: entryId, toId: match.id } },
        create: { fromId: entryId, toId: match.id, relationLabel: entity.name, weight: 1.0 },
        update: {},
      }).catch(() => {})

      // Reverse link: match → entryId (so it appears in both)
      await prisma.entryRelation.upsert({
        where: { fromId_toId: { fromId: match.id, toId: entryId } },
        create: { fromId: match.id, toId: entryId, relationLabel: entity.name, weight: 1.0 },
        update: {},
      }).catch(() => {})
    }
  }
}
