import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react"; // Using Music icon for dance

export function Header() {
  return (
    <header className="py-6 px-4 md:px-8 sticky top-0 z-50 bg-background/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Music className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-primary tracking-tight">
            DanceHub
          </span>
        </Link>
        <nav>
          <Button asChild variant="ghost">
            <Link href="#signup">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
