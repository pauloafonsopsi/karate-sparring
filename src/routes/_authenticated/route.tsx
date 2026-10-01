import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getAppConfig } from "@/lib/app.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AreaLogada,
});

function AreaLogada() {
  const { data } = useQuery({ queryKey: ["config"], queryFn: () => getAppConfig() });
  const aviso = data?.aviso_global ?? "";

  return (
    <>
      {aviso ? (
        <div className="border-b border-line bg-surface px-4 py-3 text-center text-sm text-foreground">
          {aviso}
        </div>
      ) : null}
      <Outlet />
    </>
  );
}
