import { NextResponse } from "next/server"
import { getActiveTracksWithPhases } from "@/lib/trilhas/queries"

export async function GET() {
  try {
    const data = await getActiveTracksWithPhases()
    return NextResponse.json({ data })
  } catch (error) {
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
