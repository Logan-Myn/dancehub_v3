import { createServerClient } from "@/lib/supabase";
import Navbar from "@/app/components/Navbar";

export default async function ServerNavbar() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  return <Navbar initialUser={session?.user ?? null} />;
} 