import "server-only";
import { cookies } from "next/headers";
import { AdminConsole } from "@/components/admin-ai";
import { handleAdmin } from "@/cloud-vision/server/admin";
export const dynamic = "force-dynamic";
export default async function AdminAIPage() {
  const jar = await cookies();
  const response = await handleAdmin(
    new Request("https://hidden-data.ouahad.space/api/admin/ai", {
      headers: { cookie: jar.toString() },
    }),
    process.env,
  );
  const initial = response.ok ? await response.json() : null;
  return <AdminConsole initial={initial} />;
}
