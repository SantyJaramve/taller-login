import { useRef, useEffect, useState } from 'react';

interface IntroScreenProps {
  onFinished: () => void;
}

export default function IntroScreen({ onFinished }: IntroScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    const video = videoRef.current;
    if (!video) return;

    const timer = setTimeout(() => {
      video.play().catch(() => onFinished());
    }, 400);

    const handleEnd = () => onFinished();
    video.addEventListener('ended', handleEnd);

    return () => {
      clearTimeout(timer);
      video.removeEventListener('ended', handleEnd);
    };
  }, [onFinished]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease',
    }}>
      <video
        ref={videoRef}
        src="/anil.mp4"
        style={{
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
        }}
        muted
        playsInline
      />
    </div>
  );
}
