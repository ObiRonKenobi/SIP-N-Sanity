import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

/**
 * Dev-only: persist office walk layout to data/office-walk-layout.json.
 */
export async function PUT(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected object" }, { status: 400 });
  }

  const file = path.join(process.cwd(), "data", "office-walk-layout.json");
  await writeFile(file, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  return NextResponse.json({ ok: true });
}
