import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  // Do not log URLs, request headers, messages, form values or payment payloads.
  console.error(JSON.stringify({ event: "request_error", time: new Date().toISOString(),
    digest: error instanceof Error && "digest" in error ? String(error.digest) : null, method: request.method, route: context.routePath,
    routeType: context.routeType }));
};
