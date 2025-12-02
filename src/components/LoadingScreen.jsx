import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

export function LoadingScreen() {
  const { active, progress } = useProgress();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
    } else {
      // Small delay to ensure smooth transition out
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!visible) return null;

  return (
    <div className={`loading-screen ${!active ? "fade-out" : ""}`}>
      <div className="loading-content">
        <h2 className="loading-title">Tanny's Workbench</h2>
        <div className="loading-bar-container">
          <div className="loading-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="loading-text">
          {progress === 100 ? "Ready" : `Loading ${progress.toFixed(0)}%`}
        </div>
      </div>
    </div>
  );
}
