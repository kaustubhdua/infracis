import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "infracis-web",
    checkedAt: new Date().toISOString(),
    integrations: {
      geocoding: "external-on-demand",
      weather: "external-on-demand",
      amenities: "external-on-demand"
    },
    note: "This endpoint confirms the web route is responding; it does not certify upstream provider health."
  }, { headers: { "Cache-Control": "no-store" } });
}
