import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "../../../lib/config";
import { loadApiSpecs } from "../../../lib/openapi";

export async function POST(request: NextRequest) {
  const { specName, method, path, headers, body } = await request.json();

  if (!specName || !method || !path) {
    return NextResponse.json(
      { error: "Missing specName, method, or path" },
      { status: 400 },
    );
  }

  const config = loadConfig();
  const specs = loadApiSpecs(config.api ?? []);
  const spec = specs.find((s) => s.name === specName);

  if (!spec) {
    return NextResponse.json(
      { error: `Unknown spec: ${specName}` },
      { status: 404 },
    );
  }

  const url = spec.server.url + path;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const responseBody = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    }, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error
        ? `${error.message}${error.cause ? `: ${(error.cause as Error).message}` : ""}`
        : "Request failed";
    return NextResponse.json(
      {
        status: 502,
        statusText: "Bad Gateway",
        body: `Could not reach ${url}\n${message}`,
      },
      { status: 502 },
    );
  }
}
