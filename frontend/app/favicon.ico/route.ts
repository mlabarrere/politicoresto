import { NextResponse } from "next/server";

export function GET(request: Request) {
  return NextResponse.redirect(new URL("/logo-politicoresto.svg", request.url), 307);
}
