"use client";

import { useEffect, useState } from "react";
import { getUser } from "../lib/auth";

export function useAuth() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // This function loads user profile from local storage on mount.
    setUser(getUser());
  }, []);

  return { user };
}
