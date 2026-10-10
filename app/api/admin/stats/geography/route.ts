import { NextRequest, NextResponse } from "next/server"
import { eq, and, gte, lt } from "drizzle-orm"
import { parsePhoneNumberFromString } from "libphonenumber-js/max"
import { requireMentorAccess } from "@/lib/utils/auth"
import { db, bookings, profiles } from "@/lib/db"
import {
  DDD_TO_STATE,
  extractDddFromBrazilianNumber,
  isBrazilianNumber,
  getCountryName,
} from "@/lib/brazil-ddd"

export async function GET(request: NextRequest) {
  const authError = await requireMentorAccess()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get("month")

  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth()

  if (monthParam) {
    const [y, m] = monthParam.split("-").map(Number)
    if (y && m && m >= 1 && m <= 12) {
      year = y
      month = m - 1
    }
  }

  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 1)

  const rows = await db
    .select({
      profileWhatsapp: profiles.whatsapp,
      guestWhatsapp: bookings.guestWhatsapp,
    })
    .from(bookings)
    .leftJoin(profiles, eq(bookings.menteeId, profiles.id))
    .where(
      and(
        eq(bookings.status, "completed"),
        gte(bookings.createdAt, startDate),
        lt(bookings.createdAt, endDate),
      ),
    )

  const brazilCounts = new Map<string, number>()
  const internationalCounts = new Map<string, number>()

  for (const row of rows) {
    const phone = row.profileWhatsapp || row.guestWhatsapp
    if (!phone) continue

    if (isBrazilianNumber(phone)) {
      const ddd = extractDddFromBrazilianNumber(phone)
      if (ddd) {
        const info = DDD_TO_STATE[ddd]
        const key = info ? info.state : ddd
        brazilCounts.set(key, (brazilCounts.get(key) || 0) + 1)
      }
    } else {
      const parsed = parsePhoneNumberFromString(phone)
      if (parsed?.country) {
        const code = parsed.country
        internationalCounts.set(code, (internationalCounts.get(code) || 0) + 1)
      }
    }
  }

  const brazil = Array.from(brazilCounts.entries())
    .map(([state, count]) => {
      const ddds = Object.entries(DDD_TO_STATE)
        .filter(([, info]) => info.state === state)
        .map(([ddd]) => ddd)
      const info = Object.values(DDD_TO_STATE).find((i) => i.state === state)
      return {
        state,
        name: info?.name || state,
        ddds,
        count,
      }
    })
    .sort((a, b) => b.count - a.count)

  const international = Array.from(internationalCounts.entries())
    .map(([countryCode, count]) => ({
      countryCode,
      country: getCountryName(countryCode),
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ brazil, international })
}
