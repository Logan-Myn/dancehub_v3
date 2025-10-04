import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import LiveClassVideoPage from "@/components/LiveClassVideoPage";

interface LiveClassPageProps {
  params: {
    classId: string;
  };
}

export default async function LiveClassPage({ params }: LiveClassPageProps) {
  const { classId } = params;
  const supabase = createAdminClient();

  // Fetch live class details
  const { data: liveClass, error: classError } = await supabase
    .from("live_classes_with_details")
    .select("*")
    .eq("id", classId)
    .single();

  if (classError || !liveClass) {
    redirect("/");
  }

  return (
    <LiveClassVideoPage
      classId={classId}
      liveClass={liveClass}
    />
  );
}