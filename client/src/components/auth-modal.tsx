import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogIn, Mail, User } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const handleLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Sign in to Recipe Database
          </DialogTitle>
          <DialogDescription>
            Choose your preferred sign-in method to add your own recipes to the database.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4">
          <Button
            onClick={() => handleLogin('replit')}
            variant="outline"
            className="w-full flex items-center justify-center gap-3 h-12"
          >
            <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded"></div>
            Continue with Replit
          </Button>
          
          <Button
            onClick={() => handleLogin('google')}
            variant="outline"
            className="w-full flex items-center justify-center gap-3 h-12"
          >
            <Mail className="h-5 w-5 text-red-500" />
            Continue with Google
          </Button>
          
          <Button
            onClick={() => handleLogin('facebook')}
            variant="outline"
            className="w-full flex items-center justify-center gap-3 h-12"
          >
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">f</span>
            </div>
            Continue with Facebook
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          By signing in, you agree to contribute recipes to our shared database.
        </div>
      </DialogContent>
    </Dialog>
  );
}