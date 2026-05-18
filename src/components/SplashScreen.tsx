import { useEffect, useState } from 'react';

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="splash-screen" aria-label="Lumitra loading">
      <div className="splash-card">
        <img src="/lumitra-icon.svg" alt="" />
        <strong>Lumitra</strong>
        <span>Studio</span>
        <em>Crafted by Andrei Pabiarzhyn</em>
        <div className="splash-progress" aria-hidden="true">
          <i />
        </div>
      </div>
    </div>
  );
}
