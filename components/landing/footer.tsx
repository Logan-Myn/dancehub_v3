export function Footer() {
  return (
    <footer className="py-8 bg-muted/50">
      <div className="container mx-auto text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} DanceHub. All rights reserved.</p>
        <p className="text-sm mt-1">Empowering Dance Communities Worldwide</p>
      </div>
    </footer>
  );
}
