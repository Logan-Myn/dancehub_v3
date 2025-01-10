import { createPagesServerClient } from "@/lib/supabase";
import Navbar from "./Navbar";

export default async function ServerNavbar() {
  const supabase = createPagesServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <Navbar initialUser={user} />;
} 