import { NextRequest, NextResponse } from "next/server";
import { getNearestStations } from "@/lib/yandex-rasp";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const results = await getNearestStations(lat, lng);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load nearby stations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
