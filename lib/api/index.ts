/* Public API entry point.
   For now, everything routes to the mock implementation.
   When real Claude integration is ready, swap this re-export for a smart
   router that calls the real endpoints while keeping the same surface. */

export * from "./types";
export * from "./mock";
