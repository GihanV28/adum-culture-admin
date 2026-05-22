import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
await db.productCollection.deleteMany({})
await db.productImage.deleteMany({})
await db.productSize.deleteMany({})
const deleted = await db.product.deleteMany({})
console.log('Deleted', deleted.count, 'products and all related records')
await db.$disconnect()
