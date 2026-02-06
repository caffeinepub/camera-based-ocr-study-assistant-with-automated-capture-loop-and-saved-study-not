import { useState, useEffect, useRef } from 'react';
import { useCamera } from '../camera/useCamera';
import { extractTextFromImage } from '../utils/ocr';
import { calculateSimilarity } from '../utils/similarity';
import { useGetNotes, useCreateNote, useDeleteNote } from '../hooks/useNotes';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Camera, Play, Square, Copy, Save, Trash2, AlertCircle, Loader2, LogOut, Info } from 'lucide-react';
import { toast } from 'sonner';

type Status = 'idle' | 'scanning' | 'processing' | 'waiting' | 'error' | 'paused';

export default function StudyScannerScreen() {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const {
    isActive,
    isSupported,
    error: cameraError,
    isLoading: cameraLoading,
    startCamera,
    stopCamera,
    switchCamera,
    retry,
    videoRef,
    canvasRef,
    currentFacingMode,
  } = useCamera({ facingMode: 'environment' });

  const [isAutomating, setIsAutomating] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [extractedText, setExtractedText] = useState('');
  const [lastAcceptedText, setLastAcceptedText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [ocrError, setOcrError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  const { data: notes = [], isLoading: notesLoading } = useGetNotes();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  // Automated capture loop
  useEffect(() => {
    if (!isAutomating || !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const processFrame = async () => {
      if (isProcessingRef.current || !videoRef.current || !canvasRef.current) {
        return;
      }

      isProcessingRef.current = true;
      setStatus('scanning');

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
          isProcessingRef.current = false;
          return;
        }

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the full frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Calculate target box region (center 80% of frame)
        const boxWidth = canvas.width * 0.8;
        const boxHeight = canvas.height * 0.6;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;

        // Create a new canvas for the cropped region
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = boxWidth;
        croppedCanvas.height = boxHeight;
        const croppedCtx = croppedCanvas.getContext('2d');

        if (!croppedCtx) {
          isProcessingRef.current = false;
          return;
        }

        croppedCtx.drawImage(
          canvas,
          boxX,
          boxY,
          boxWidth,
          boxHeight,
          0,
          0,
          boxWidth,
          boxHeight
        );

        setStatus('processing');

        // Run OCR on cropped region
        const text = await extractTextFromImage(croppedCanvas);

        // Validate text length
        const trimmedText = text.trim();
        if (trimmedText.length < 15) {
          setStatus('waiting');
          isProcessingRef.current = false;
          return;
        }

        // Check similarity with last accepted text
        const similarity = lastAcceptedText ? calculateSimilarity(trimmedText, lastAcceptedText) : 0;

        if (similarity >= 0.8) {
          setStatus('waiting');
          isProcessingRef.current = false;
          return;
        }

        // New content detected
        setExtractedText(trimmedText);
        setLastAcceptedText(trimmedText);
        setStatus('idle');
        setOcrError(null);
      } catch (error) {
        console.error('OCR processing error:', error);
        setOcrError(error instanceof Error ? error.message : 'OCR failed');
        setStatus('error');
        setIsAutomating(false);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Initial process
    processFrame();

    // Set up interval
    intervalRef.current = setInterval(processFrame, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAutomating, isActive, lastAcceptedText, videoRef, canvasRef]);

  const handleStartStop = async () => {
    if (isAutomating) {
      setIsAutomating(false);
      setStatus('idle');
    } else {
      if (!isActive) {
        const success = await startCamera();
        if (!success) {
          toast.error('Failed to start camera');
          return;
        }
      }
      setIsAutomating(true);
      setStatus('scanning');
      setOcrError(null);
    }
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      toast.success('Text copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  const handleSave = async () => {
    if (!extractedText) return;
    try {
      const title = noteTitle.trim() || `Note ${new Date().toLocaleString()}`;
      await createNote.mutateAsync({ title, extractedText });
      toast.success('Note saved successfully');
      setNoteTitle('');
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const handleDelete = async (noteId: bigint) => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleRetry = async () => {
    setOcrError(null);
    setStatus('idle');
    const success = await retry();
    if (success && !isAutomating) {
      setIsAutomating(true);
      setStatus('scanning');
    }
  };

  const handleSwitchCamera = async () => {
    await switchCamera();
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const getStatusText = () => {
    switch (status) {
      case 'scanning':
        return 'Scanning...';
      case 'processing':
        return 'Processing OCR...';
      case 'waiting':
        return 'Not enough text; waiting...';
      case 'error':
        return 'Error occurred';
      case 'paused':
        return 'Paused';
      default:
        return 'Idle';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'scanning':
      case 'processing':
        return 'bg-blue-500';
      case 'waiting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isSupported === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Camera Not Supported
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your browser or device does not support camera access. Please try a different browser or device.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Study Scanner</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="grid h-full lg:grid-cols-2">
          {/* Camera Viewfinder */}
          <div className="relative flex flex-col bg-black">
            <div className="relative flex-1 flex items-center justify-center min-h-[400px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-contain"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Target Box Overlay */}
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4/5 h-3/5 border-4 border-primary/60 rounded-lg shadow-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  </div>
                </div>
              )}

              {/* Camera Error */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                  <Card className="w-full max-w-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Camera Error
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{cameraError.message}</p>
                      <Button onClick={handleRetry} className="w-full">
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* OCR Error */}
              {ocrError && (
                <div className="absolute top-4 left-4 right-4">
                  <Card className="bg-destructive/10 border-destructive">
                    <CardContent className="flex items-start gap-2 p-4">
                      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">OCR Error</p>
                        <p className="text-xs text-destructive/80">{ocrError}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={handleRetry}>
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="border-t border-border/40 bg-card/90 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
                  <span className="text-sm font-medium">{getStatusText()}</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentFacingMode === 'environment' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSwitchCamera}
                      disabled={!isActive || cameraLoading}
                    >
                      Switch
                    </Button>
                  )}
                  <Button
                    onClick={handleStartStop}
                    disabled={cameraLoading}
                    size="lg"
                    variant={isAutomating ? 'destructive' : 'default'}
                  >
                    {cameraLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : isAutomating ? (
                      <Square className="mr-2 h-5 w-5" />
                    ) : (
                      <Play className="mr-2 h-5 w-5" />
                    )}
                    {isAutomating ? 'Stop' : 'Start'} Automation
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="flex flex-col bg-card">
            <div className="border-b border-border/40 p-4">
              <h2 className="text-lg font-semibold">Study Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Extracted text and saved notes
              </p>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-6 p-4">
                {/* Development Notice */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Development Mode:</strong> Currently using mock OCR data. To enable real text extraction, 
                    install tesseract.js by adding it to package.json dependencies.
                  </AlertDescription>
                </Alert>

                {/* Latest Capture */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Latest Capture</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {extractedText ? (
                      <>
                        <div className="rounded-md bg-muted/50 p-4 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {extractedText}
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleCopy} variant="outline" size="sm" className="flex-1">
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </Button>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label htmlFor="note-title">Save as Note (optional title)</Label>
                          <Input
                            id="note-title"
                            placeholder="Enter note title..."
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                          />
                          <Button
                            onClick={handleSave}
                            disabled={createNote.isPending}
                            className="w-full"
                          >
                            {createNote.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Note
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No text captured yet. Start automation to begin scanning.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Saved Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No saved notes yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {notes.map((note) => (
                          <Card key={note.id.toString()} className="bg-muted/30">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{note.title}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(Number(note.createdAt) / 1000000).toLocaleString()}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(note.id)}
                                  disabled={deleteNote.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-3">
                                {note.extractedText}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ethical Use Notice */}
                <Card className="bg-accent/20 border-accent">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">
                      <strong>Ethical Use:</strong> This app is designed for legitimate study assistance only.
                      Do not use it to cheat on exams or bypass academic integrity policies.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 bg-card/30 py-4">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
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
