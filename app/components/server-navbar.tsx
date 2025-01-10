import { createServerClient } from "@/lib/supabase";
import Navbar from "./Navbar";

export default async function ServerNavbar() {
  const supabase = createServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <Navbar initialUser={user} />;
} 