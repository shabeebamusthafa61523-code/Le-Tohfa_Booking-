import React, { useState, useEffect } from 'react';

export const SplashScreen = ({ onFinished }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show splash screen for 1.4s, then fade out
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 1400);

    const finishTimer = setTimeout(() => {
      if (onFinished) onFinished();
    }, 1850);

    return () => {
      clearTimeout(timer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0f172a',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.45s ease-out',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '400px',
        }}
      >
        {/* Le'Tohfa Farmfinity Transparent Wooden Logo 2 */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <img
            src="/logo2.png"
            alt="Le'Tohfa Farmfinity Logo"
            style={{
              maxWidth: '310px',
              width: '90%',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.12))',
            }}
          />
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '0.82rem',
            fontWeight: '800',
            color: '#16a34a',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            margin: '0 0 2.25rem 0',
          }}
        >
          RESORT BOOKING SYSTEM
        </p>

        {/* Animated Loader Spinner */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              border: '3.5px solid rgba(22, 163, 74, 0.15)',
              borderTopColor: '#16a34a',
              borderRightColor: '#059669',
              borderRadius: '50%',
              animation: 'splashSpin 0.75s linear infinite',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', letterSpacing: '0.03em' }}>
            Loading Resort Calendar...
          </span>
        </div>
      </div>

      <style>{`
        @keyframes splashSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
