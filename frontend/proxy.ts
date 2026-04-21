import type { NextRequest } from "next/server";

import { createLogger, runWithRequest, withRequest } from "@/lib/logger";
import { updateSession } from "@/lib/supabase/middleware";

const log = createLogger("http");

export async function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestLogger = withRequest(log, request).child({ request_id: requestId });
  const start = performance.now();

  return runWithRequest({ requestId, logger: requestLogger }, async () => {
    requestLogger.info({ event: "request.start" }, "request received");
    try {
      const response = await updateSession(request);
      response.headers.set("x-request-id", requestId);
      requestLogger.info(
        {
          event: "request.end",
          status: response.status,
          duration_ms: Math.round(performance.now() - start)
        },
        "request completed"
      );
      return response;
    } catch (err) {
      requestLogger.error(
        {
          event: "request.error",
          duration_ms: Math.round(performance.now() - start),
          err
        },
        "request failed"
      );
      throw err;
    }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
