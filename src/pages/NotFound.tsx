import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Compass size={26} className="text-primary" />
        </div>
        <h1 className="font-display text-6xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-lg font-medium text-foreground">Page not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <Button asChild variant="hero" className="mt-6">
          <Link to="/">
            <Home size={15} className="mr-2" /> Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
