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

const SmoothZoom = ({ orbitControlsRef }) => {
  const { camera, gl } = useThree();
  const tweenRef = useRef(null);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleWheel = (e) => {
      if (!orbitControlsRef.current) return;
      e.preventDefault();

      // Kill any running zoom tween
      if (tweenRef.current) tweenRef.current.kill();

      const controls = orbitControlsRef.current;
      const target = controls.target;

      // Current distance
      const currentDist = camera.position.distanceTo(target);

      // Calculate target distance
      // Scroll down (positive delta) -> Zoom out (increase distance)
      // Scroll up (negative delta) -> Zoom in (decrease distance)
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      const scale = Math.pow(1.05, delta * 0.1); // Adjust sensitivity

      let targetDist = currentDist * scale;

      // Clamp (OrbitControls defaults or custom)
      targetDist = Math.max(2, Math.min(50, targetDist));

      // Animate
      tweenRef.current = gsap.to(
        { dist: currentDist },
        {
          dist: targetDist,
          duration: 1.0, // Smooth duration
          ease: "power3.out",
          onUpdate: function () {
            const newDist = this.targets()[0].dist;

            // Apply new distance while preserving rotation
            const direction = camera.position.clone().sub(target).normalize();
            camera.position.copy(target).add(direction.multiplyScalar(newDist));
          },
        }
      );
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [camera, gl, orbitControlsRef]);

  return null;
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
  const orbitControlsRef = useRef();

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

    // Explicitly stop any running tweens on the objects
    if (iphoneRef.current.stop) iphoneRef.current.stop();
    if (cameraControlRef.current.stop) cameraControlRef.current.stop();

    // 1. Set Initial State
    iphoneRef.current.set({ position: initialState.phone });
    cameraControlRef.current.set({ position: initialState.camera });

    if (orbitControlsRef.current) {
      const target = initialState.target || { x: 0, y: 0, z: 0 };
      orbitControlsRef.current.target.set(target.x, target.y, target.z);
      orbitControlsRef.current.update();
    }

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

      if (orbitControlsRef.current && step.target) {
        stepTl.to(
          orbitControlsRef.current.target,
          {
            x: step.target.x,
            y: step.target.y,
            z: step.target.z,
            duration: step.duration,
            ease: step.ease,
          },
          0
        );
      }

      masterTl.add(stepTl, "+=" + (step.delay || 0));
    });
  };

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const handleStartRecording = async () => {
    try {
      // We must use getDisplayMedia to capture the iframe (DOM element)
      // canvas.captureStream() cannot see the iframe.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 60,
          displaySurface: "browser",
        },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      });

      // Hide UI for the recording
      setShowUI(false);
      setIsRecording(true);

      const mimeTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];

      const mimeType =
        mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "video/webm";

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        a.href = url;
        a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);

        // Restore UI and state
        setIsRecording(false);
        setShowUI(true);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();

      // Handle case where user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      };
    } catch (err) {
      console.error("Error starting recording:", err);
      setIsRecording(false);
      setShowUI(true); // Ensure UI comes back if error
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };
  const handleCapture = () => {
    const phoneState = iphoneRef.current ? iphoneRef.current.getState() : null;
    const cameraState = cameraControlRef.current ? cameraControlRef.current.getState() : null;
    const target = orbitControlsRef.current
      ? orbitControlsRef.current.target
      : { x: 0, y: 0, z: 0 };

    return {
      phone: phoneState ? phoneState.position : { x: 0, y: 0, z: 0 },
      camera: cameraState ? cameraState.position : { x: 0, y: 0, z: 25 },
      target: { x: target.x, y: target.y, z: target.z },
    };
  };

  const [savedAnimations, setSavedAnimations] = useState([]);

  useEffect(() => {
    if (!showUI) {
      const saved = localStorage.getItem("savedAnimations");
      if (saved) {
        setSavedAnimations(JSON.parse(saved));
      }
    }
  }, [showUI]);

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
          <OrbitControls
            ref={orbitControlsRef}
            enableZoom={false}
            enablePan={true}
            enableDamping={true}
            dampingFactor={0.05}
          />
          <SmoothZoom orbitControlsRef={orbitControlsRef} />
        </Canvas>
      </div>
      <LoadingScreen />
      {!showUI && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            pointerEvents: "auto",
          }}>
          {isRecording && (
            <button
              onClick={handleStopRecording}
              style={{
                padding: "10px 20px",
                background: "#ef4444",
                color: "#ffffff",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                backdropFilter: "blur(10px)",
                boxShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
              }}>
              Stop Recording
            </button>
          )}

          <button
            onClick={() => setShowUI(true)}
            style={{
              padding: "10px 20px",
              background: "var(--bg-panel)",
              color: "var(--text-main)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              backdropFilter: "blur(10px)",
            }}>
            ay bring me back
          </button>

          {savedAnimations.length > 0 && (
            <div
              style={{
                background: "var(--bg-panel)",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                backdropFilter: "blur(10px)",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)" }}>
                Play Saved:
              </span>
              {savedAnimations.map((anim, index) => (
                <button
                  key={index}
                  onClick={() =>
                    handlePlayAnimation({ initialState: anim.initialState, steps: anim.steps })
                  }
                  style={{
                    padding: "6px 12px",
                    background: "var(--button-bg)",
                    color: "var(--button-text)",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    textAlign: "left",
                  }}>
                  {anim.name}
                </button>
              ))}
            </div>
          )}
        </div>
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
            {isSpinning ? "Staaahp im dizzy" : "Spin me"}
          </button>
          <button
            onClick={() => {
              if (cameraControlRef.current) {
                cameraControlRef.current.move(
                  { position: { x: 0, y: 0, z: 15 } },
                  1.5,
                  "power3.out"
                );
              }
              if (iphoneRef.current) {
                iphoneRef.current.move(
                  { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } },
                  1.5,
                  "power3.out"
                );
              }
              if (orbitControlsRef.current) {
                orbitControlsRef.current.target.set(0, 0, 0);
                orbitControlsRef.current.update();
              }
            }}
            style={{ marginTop: "5px" }}>
            Bring me back
          </button>
        </div>
        <AnimationControls
          onPlay={handlePlayAnimation}
          onCapture={handleCapture}
          isRecording={isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
        />
      </div>
    </div>
  );
}

export default App;
