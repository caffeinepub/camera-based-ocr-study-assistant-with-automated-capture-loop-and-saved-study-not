import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Camera, Scan, BookOpen } from 'lucide-react';

export default function LoginGate() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Study Scanner</h1>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Scan className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome to Study Scanner</h2>
            <p className="text-lg text-muted-foreground">
              Capture text from your study materials with automated OCR and save notes for later review.
            </p>
          </div>

          <div className="space-y-4 rounded-lg border border-border/50 bg-card/30 p-6">
            <div className="flex items-start gap-3 text-left">
              <Camera className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-medium">Automated Capture</h3>
                <p className="text-sm text-muted-foreground">
                  Point your camera at text and let the app automatically extract it every 3 seconds
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-left">
              <BookOpen className="mt-1 h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-medium">Save Study Notes</h3>
                <p className="text-sm text-muted-foreground">
                  Copy extracted text or save it as a note for future reference
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={login}
            disabled={isLoggingIn}
            size="lg"
            className="w-full"
          >
            {isLoggingIn ? 'Logging in...' : 'Login to Get Started'}
          </Button>

          <p className="text-xs text-muted-foreground">
            This app is designed for ethical study assistance only
          </p>
        </div>
      </main>

      <footer className="border-t border-border/40 bg-card/30 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026. Built with <span className="text-red-500">♥</span> using{' '}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
