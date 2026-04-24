"use client";

import { RouteState } from "@/components/shared/RouteState";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <RouteState
      type="error"
      title="Command workspace unavailable"
      message="The local UI state could not be initialized."
      actionLabel="Retry"
      onAction={reset}
    />
  );
}
