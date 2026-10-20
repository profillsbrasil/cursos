"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

import { setClerkAuthTokenGetter } from "@/utils/clerk-auth";

export function ClerkApiAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkAuthTokenGetter(getToken);

    return () => {
      setClerkAuthTokenGetter(null);
    };
  }, [getToken]);

  return null;
}
