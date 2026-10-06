// Bearer token attacher for protected server functions (requireSupabaseAuth).
// Called on the client before every server function request.
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return next();
    return next({ headers: { Authorization: `Bearer ${token}` } });
  },
);
