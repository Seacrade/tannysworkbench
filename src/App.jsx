import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import { Iphone } from "./components/Iphone";
import { AnimationControls } from "./components/AnimationControls";
import { SceneController } from "./components/SceneController";
import { LoadingScreen } from "./components/LoadingScreen";
import gsap from "gsap";
import "./App.css";

const THEMES = {
  white: {
    name: "White",
    canvasBg: "#ffffff",
    cssVars: {
      "--bg-body": "#ffffff",
      "--text-main": "#1a1a1a",
      "--text-muted": "#666666",
      "--bg-panel": "rgba(240, 240, 240, 0.85)",
      "--bg-input": "#e0e0e0",
      "--border-color": "#ccc",
      "--button-bg": "rgba(0, 0, 0, 0.8)",
      "--button-text": "#ffffff",
    },
  },
  black: {
    name: "Black",
    canvasBg: "#111111",
    cssVars: {
      "--bg-body": "#111111",
      "--text-main": "#ffffff",
      "--text-muted": "#a1a1a1",
      "--bg-panel": "rgba(30, 30, 30, 0.85)",
      "--bg-input": "#2a2a2a",
      "--border-color": "#444",
      "--button-bg": "rgba(255, 255, 255, 0.1)",
      "--button-text": "#ffffff",
    },
  },
};

// Helper to determine text color based on background brightness
const getContrastColor = (hexColor) => {
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#1a1a1a" : "#ffffff";
};

function App() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("black");
  const [customColor, setCustomColor] = useState("#0f172a");
  const [uiWidth, setUiWidth] = useState(340);
  const [showUI, setShowUI] = useState(true);
  const isResizingRef = useRef(false);
  const iphoneRef = useRef();
  const cameraControlRef = useRef();
  const timelineRef = useRef(null);

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
  }, []);

  useEffect(() => {
    let theme;
    if (currentTheme === "custom") {
      const textColor = getContrastColor(customColor);
      const isLight = textColor === "#1a1a1a";

      theme = {
        canvasBg: customColor,
        cssVars: {
          "--bg-body": customColor,
          "--text-main": textColor,
          "--text-muted": isLight ? "#666666" : "#a1a1a1",
          "--bg-panel": isLight ? "rgba(240, 240, 240, 0.85)" : "rgba(30, 30, 30, 0.85)",
          "--bg-input": isLight ? "#e0e0e0" : "#2a2a2a",
          "--border-color": isLight ? "#ccc" : "#444",
          "--button-bg": isLight ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.1)",
          "--button-text": "#ffffff",
        },
      };
    } else {
      theme = THEMES[currentTheme];
    }

    const root = document.documentElement;
    Object.entries(theme.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [currentTheme, customColor]);

  const handlePlayAnimation = ({ initialState, steps }) => {
    if (!iphoneRef.current || !cameraControlRef.current) return;

    // Kill previous timeline if it exists
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    // 1. Set Initial State
    iphoneRef.current.set({ position: initialState.phone });
    cameraControlRef.current.set({ position: initialState.camera });

    // 2. Create Master Timeline
    const masterTl = gsap.timeline();
    timelineRef.current = masterTl;

    // 3. Add Steps
    steps.forEach((step) => {
      const stepTl = gsap.timeline();

      const phoneAnim = iphoneRef.current.move({ position: step.phone }, step.duration, step.ease);

      const cameraAnim = cameraControlRef.current.move(
        { position: step.camera },
        step.duration,
        step.ease
      );

      if (phoneAnim) stepTl.add(phoneAnim, 0);
      if (cameraAnim) stepTl.add(cameraAnim, 0);

      masterTl.add(stepTl);
    });
  };

  const handleCapture = () => {
    const phoneState = iphoneRef.current ? iphoneRef.current.getState() : null;
    const cameraState = cameraControlRef.current ? cameraControlRef.current.getState() : null;

    return {
      phone: phoneState ? phoneState.position : { x: 0, y: 0, z: 0 },
      camera: cameraState ? cameraState.position : { x: 0, y: 0, z: 25 },
    };
  };

  return (
    <div className="App">
      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
          <color
            attach="background"
            args={[currentTheme === "custom" ? customColor : THEMES[currentTheme].canvasBg]}
          />
          <ambientLight intensity={0.5} />
          <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} />

          <Suspense fallback={null}>
            <SceneController ref={cameraControlRef} />
            <Iphone ref={iphoneRef} scale={[0.5, 0.5, 0.5]} isSpinning={isSpinning} />
            <Environment preset="city" />
          </Suspense>

          <ContactShadows position={[0, -2.5, 0]} opacity={0.6} scale={10} blur={2} far={5} />
          <OrbitControls enableZoom={true} enablePan={true} />
        </Canvas>
      </div>
      <LoadingScreen />
      {!showUI && (
        <button
          onClick={() => setShowUI(true)}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 100,
            padding: "10px 20px",
            background: "var(--bg-panel)",
            color: "var(--text-main)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            backdropFilter: "blur(10px)",
            pointerEvents: "auto",
          }}>
          ay bring me back
        </button>
      )}
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
            zIndex: 20,
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
                  background:
                    currentTheme === themeKey ? "var(--primary-color)" : "var(--button-bg)",
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
                  background:
                    currentTheme === "custom" ? "var(--primary-color)" : "var(--button-bg)",
                  opacity: currentTheme === "custom" ? 1 : 0.7,
                }}>
                Custom
              </button>
            </div>
          </div>
          <button onClick={() => setIsSpinning(!isSpinning)}>
            {isSpinning ? "Stop Spinning" : "Start Spinning"}
          </button>
        </div>
        <AnimationControls onPlay={handlePlayAnimation} onCapture={handleCapture} />
      </div>
    </div>
  );
}

export default App;
