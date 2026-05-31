import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })

  let types = await db.costCalProductionCostType.findMany({ orderBy: { name: 'asc' } })

  // Backfill defaultPrice from existing costings for types that have no price yet
  const typesNeedingPrice = types.filter(t => !t.defaultPrice || t.defaultPrice === 0)
  if (typesNeedingPrice.length > 0) {
    const costings = await db.costCalCosting.findMany({
      orderBy: { createdAt: 'desc' },
      select: { otherCosts: true },
    })

    // Build a map of label → most-recent price (costings are already in desc order)
    const priceMap: Record<string, number> = {}
    for (const costing of costings) {
      const costs = costing.otherCosts as { label: string; amount: number }[] | null
      if (!costs) continue
      for (const cost of costs) {
        if (!priceMap[cost.label] && cost.amount > 0) {
          priceMap[cost.label] = cost.amount
        }
      }
    }

    // Persist the backfilled prices so subsequent requests are instant
    const toUpdate = typesNeedingPrice.filter(t => priceMap[t.name])
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map(t =>
          db.costCalProductionCostType.update({
            where: { id: t.id },
            data: { defaultPrice: priceMap[t.name] },
          })
        )
      )
      // Merge the new prices into the response
      types = types.map(t => ({
        ...t,
        defaultPrice: priceMap[t.name] ?? t.defaultPrice,
      }))
    }
  }

  return NextResponse.json({ success: true, data: { types } })
}

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })
  try {
    const body = schema.parse(await req.json())
    const type = await db.costCalProductionCostType.create({ data: body })
    return NextResponse.json({ success: true, data: { type } }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ success: false, errors: err.errors }, { status: 400 })
    if ((err as { code?: string }).code === 'P2002')
      return NextResponse.json({ success: false, message: 'A cost type with that name already exists.' }, { status: 409 })
    return NextResponse.json({ success: false, message: 'Failed to create cost type.' }, { status: 500 })
  }
}
