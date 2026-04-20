import type { SummarizeRequest, SummarizeResponse } from "./types";
import { persistSummarizeResponse } from "./mock";

/* Thrown when the route returns 401. Caller (Landing / Workspace
   submit handlers) catches this and routes the user to /sign-in,
   carrying their current path as ?next=. */
export class AuthRequiredError extends Error {
  constructor() { super("auth_required"); this.name = "AuthRequiredError"; }
}

/* Calls the /api/summarize route handler (which talks to Claude) and
   persists the response to localStorage so the rest of the app can read
   it via the existing get* functions. Same SummarizeRequest/Response
   shape as the mock — the rest of the app doesn't know which one runs. */
export async function summarize(req: SummarizeRequest): Promise<SummarizeResponse> {
  let res: Response;
  try {
    res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch {
    throw new Error("Network error — could not reach the summarize endpoint.");
  }

  if (res.status === 401) {
    throw new AuthRequiredError();
  }

  if (!res.ok) {
    let message = `Summarize failed (${res.status}).`;
    try {
      const body = await res.json();
      if (body && typeof body.error === "string") message = body.error;
    } catch {}
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const data = (await res.json()) as SummarizeResponse;
  persistSummarizeResponse(data);
  return data;
}
