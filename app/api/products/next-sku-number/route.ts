import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

// Extract the trailing 4-digit number from a SKU string like "AC-F-S-0001"
function extractNumber(sku: string): number {
  const match = sku.match(/(\d{4})$/)
  return match ? parseInt(match[1], 10) : 0
}

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ success: false }, { status: 401 })

  // Gather all SKUs: main itemCode + all colorVariants[].sku
  const products = await db.product.findMany({
    select: { itemCode: true, colorVariants: true },
  })

  const allNumbers: number[] = []

  for (const p of products) {
    if (p.itemCode) allNumbers.push(extractNumber(p.itemCode))

    const variants = p.colorVariants as Array<{ sku?: string }> | null
    if (Array.isArray(variants)) {
      for (const v of variants) {
        if (v.sku) allNumbers.push(extractNumber(v.sku))
      }
    }
  }

  const maxNum = allNumbers.length > 0 ? Math.max(...allNumbers) : 0
  const nextNum = maxNum + 1
  const padded = String(nextNum).padStart(4, '0')

  return NextResponse.json({ success: true, data: { nextNumber: nextNum, padded } })
}
