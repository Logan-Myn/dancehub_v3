import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-8 bg-muted/50">
      <div className="container mx-auto text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} DanceHub. All rights reserved.</p>
        <p className="text-sm mt-1">Empowering Dance Communities Worldwide</p>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
