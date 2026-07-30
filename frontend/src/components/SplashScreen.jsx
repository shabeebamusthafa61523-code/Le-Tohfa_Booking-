import React, { useState, useEffect } from 'react';

export const SplashScreen = ({ onFinished }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show splash screen for 1.2s, then fade out
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 1200);

    const finishTimer = setTimeout(() => {
      if (onFinished) onFinished();
    }, 1650);

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
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <img
            src="/logo2.png"
            alt="Le'Tohfa Farmfinity Logo"
            style={{
              maxWidth: '320px',
              width: '90%',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 10px 24px rgba(0, 0, 0, 0.12))',
            }}
          />
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '0.85rem',
            fontWeight: '800',
            color: '#16a34a',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          RESORT BOOKING SYSTEM
        </p>
      </div>
    </div>
  );
};
