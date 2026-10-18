import { useEffect, useRef, useState } from 'react';

interface Props {
  onScan: (code: string) => void;
  paused?: boolean;
}

type Detector = { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> };

function feedback() {
  navigator.vibrate?.(80);
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
    setTimeout(() => ctx.close(), 200);
  } catch {
    /* audio unavailable */
  }
}

export default function Scanner({ onScan, paused }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const last = useRef({ code: '', at: 0 });
  const pausedRef = useRef(paused);
  const onScanRef = useRef(onScan);
  pausedRef.current = paused;
  onScanRef.current = onScan;

  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [torch, setTorch] = useState(false);
  const [torchOk, setTorchOk] = useState(false);
  const [error, setError] = useState('');
  const trackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let zxingStop: (() => void) | undefined;

    const emit = (code: string) => {
      const now = Date.now();
      if (pausedRef.current) return;
      if (code === last.current.code && now - last.current.at < 2000) return;
      last.current = { code, at: now };
      feedback();
      onScanRef.current(code);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not available (HTTPS is required).');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 } },
          audio: false,
        });
      } catch {
        setError('Camera permission denied or unavailable. You can enter codes manually.');
        return;
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      setTorchOk(!!(track.getCapabilities?.() as { torch?: boolean } | undefined)?.torch);
      const el = video.current!;
      el.srcObject = stream;
      await el.play().catch(() => undefined);

      const BD = (window as unknown as { BarcodeDetector?: new (o: object) => Detector }).BarcodeDetector;
      if (BD) {
        const detector = new BD({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] });
        timer = window.setInterval(async () => {
          if (el.readyState < 2) return;
          try {
            const found = await detector.detect(el);
            if (found[0]?.rawValue) emit(found[0].rawValue);
          } catch {
            /* frame not ready */
          }
        }, 250);
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromStream(stream, el, (result) => {
          if (result) emit(result.getText());
        });
        zxingStop = () => controls.stop();
      }
    })();

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      zxingStop?.();
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
      setTorch(false);
    };
  }, [facing]);

  const toggleTorch = async () => {
    const next = !torch;
    try {
      await trackRef.current?.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorch(next);
    } catch {
      setTorchOk(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={video} playsInline muted className="aspect-[4/3] w-full object-cover" />
      <div className="pointer-events-none absolute inset-x-8 top-1/3 h-1/3 rounded-lg border-2 border-white/70" />
      <div className="absolute bottom-2 right-2 flex gap-2">
        {torchOk && (
          <button type="button" onClick={toggleTorch} className="rounded-full bg-white/80 px-3 py-2 text-sm">
            {torch ? 'Light off' : 'Light on'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          className="rounded-full bg-white/80 px-3 py-2 text-sm"
        >
          Flip
        </button>
      </div>
      {error && <p className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-white">{error}</p>}
    </div>
  );
}
