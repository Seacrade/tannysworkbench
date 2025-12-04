import React, { useRef, useEffect } from "react";
import { AnimationControls } from "./AnimationControls";
import { THEMES } from "../constants";

export function MainUI({
  uiWidth,
  setUiWidth,
  showUI,
  setShowUI,
  currentTheme,
  setCurrentTheme,
  customColor,
  setCustomColor,
  isSpinning,
  setIsSpinning,
  spinSpeed,
  setSpinSpeed,
  quickRotationDegrees,
  setQuickRotationDegrees,
  onQuickRotate,
  onBringMeBack,
  onPlayAnimation,
  onCapture,
  isRecording,
  onStartRecording,
  onStopRecording,
  onOpenSlider3D,
}) {
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;

      // Limit width between 300px and 600px
      const newWidth = Math.max(300, Math.min(600, e.clientX));
      setUiWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setUiWidth]);

  return (
    <div className="ui-overlay" style={{ width: uiWidth, display: showUI ? "flex" : "none" }}>
      <div
        className="resize-handle"
        onMouseDown={() => {
          isResizingRef.current = true;
          document.body.style.cursor = "ew-resize";
          document.body.style.userSelect = "none";
        }}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "10px",
          cursor: "ew-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
        }}>
        <div
          style={{
            width: "4px",
            height: "40px",
            background: "var(--border-color)",
            borderRadius: "2px",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="gradient-hover">Tanny's Playground</h1>
        <button
          onClick={() => setShowUI(false)}
          style={{
            width: "auto",
            padding: "4px 8px",
            fontSize: "0.8rem",
            background: "transparent",
            border: "1px solid var(--text-muted)",
            color: "var(--text-muted)",
            cursor: "pointer",
            pointerEvents: "auto",
          }}>
          Hide
        </button>
      </div>

      <div className="controls" style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
          {Object.keys(THEMES).map((themeKey) => (
            <button
              key={themeKey}
              onClick={() => setCurrentTheme(themeKey)}
              style={{
                flex: 1,
                padding: "8px",
                fontSize: "0.8rem",
                background: currentTheme === themeKey ? "var(--primary-color)" : "var(--button-bg)",
                opacity: currentTheme === themeKey ? 1 : 0.7,
              }}>
              {THEMES[themeKey].name}
            </button>
          ))}
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setCurrentTheme("custom");
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer",
                zIndex: 2,
              }}
            />
            <button
              style={{
                width: "100%",
                height: "100%",
                padding: "8px",
                fontSize: "0.8rem",
                background: currentTheme === "custom" ? "var(--primary-color)" : "var(--button-bg)",
                opacity: currentTheme === "custom" ? 1 : 0.7,
              }}>
              Custom
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: "5px", alignItems: "center", marginBottom: "5px" }}>
          <button onClick={() => setIsSpinning(!isSpinning)} style={{ flex: 1 }}>
            {isSpinning ? "Staaahp im dizzy" : "Spin me"}
          </button>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={spinSpeed}
            onChange={(e) => setSpinSpeed(parseFloat(e.target.value))}
            style={{ width: "60px" }}
            title={`Spin Speed: ${spinSpeed}`}
          />
        </div>
        <div style={{ display: "flex", gap: "5px", marginBottom: "5px" }}>
          <input
            type="number"
            value={quickRotationDegrees}
            onChange={(e) => setQuickRotationDegrees(parseFloat(e.target.value))}
            style={{ width: "60px" }}
            placeholder="Deg"
            title="Rotation Degrees"
          />
          <button onClick={onQuickRotate} style={{ flex: 1 }}>
            Quick Rotate
          </button>
        </div>
        <button onClick={onBringMeBack} style={{ marginTop: "5px" }}>
          Bring me back
        </button>
        <button
          onClick={onOpenSlider3D}
          style={{ marginTop: "5px", background: "linear-gradient(45deg, #ff0080, #7928ca)" }}>
          Open 3D Slider
        </button>
      </div>
      <AnimationControls
        onPlay={onPlayAnimation}
        onCapture={onCapture}
        isRecording={isRecording}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    </div>
  );
}
