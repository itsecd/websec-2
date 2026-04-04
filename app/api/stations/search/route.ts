import { NextRequest, NextResponse } from "next/server";
import { searchStationsByTitle } from "@/lib/station-index";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const results = await searchStationsByTitle(query);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search stations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
