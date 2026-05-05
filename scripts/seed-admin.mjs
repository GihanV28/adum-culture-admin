import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const email = 'adumculture@gmail.com'
  const password = 'Adum@C112!'
  const hash = await bcrypt.hash(password, 12)

  const admin = await db.adminUser.upsert({
    where: { email },
    update: { passwordHash: hash },
    create: { id: 'admin-001', name: 'Adum Culture', email, passwordHash: hash, role: 'admin' },
  })

  console.log('Admin user created:', admin.email)
}

main().catch(console.error).finally(() => db.$disconnect())
