import { useEffect, useMemo, useState } from "react";
import { authAPI } from "@api/auth";

export function useSession() {
  const [session, setSession] = useState({
    isLoading: true,
    role: null,
    admin: null,
    user: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const [adminToken, userToken, admin, user] = await Promise.all([
          authAPI.getAdminToken(),
          authAPI.getUserToken(),
          authAPI.getAdmin(),
          authAPI.getUser(),
        ]);

        if (!isMounted) {
          return;
        }

        setSession({
          isLoading: false,
          role: adminToken ? "admin" : userToken ? "user" : null,
          admin: adminToken ? admin : null,
          user: userToken ? user : null,
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setSession({
          isLoading: false,
          role: null,
          admin: null,
          user: null,
        });
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return useMemo(
    () => ({
      ...session,
      isAuthenticated: Boolean(session.role),
    }),
    [session],
  );
}
