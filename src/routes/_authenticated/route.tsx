import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  // The authenticated area is intentionally client-only. The Supabase browser
  // session lives in browser storage, so attempting to resolve it during SSR
  // can make the deployed app fail before the agenda page is rendered.
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      throw redirect({ to: "/auth" });
    }

    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
