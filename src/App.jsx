import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Environment,
  ArcballControls,
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { Iphone } from "./components/Iphone";
import { MainUI } from "./components/MainUI";
import { SceneController } from "./components/SceneController";
import { LoadingScreen } from "./components/LoadingScreen";
import { THEMES, getContrastColor } from "./constants";
import gsap from "gsap";
import "./App.css";

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
  const [spinSpeed, setSpinSpeed] = useState(0.5);
  const [quickRotationDegrees, setQuickRotationDegrees] = useState(360);
  const [currentTheme, setCurrentTheme] = useState("black");
  const [customColor, setCustomColor] = useState("#0f172a");
  const [uiWidth, setUiWidth] = useState(340);
  const [showUI, setShowUI] = useState(true);
  const iphoneRef = useRef();
  const cameraControlRef = useRef();
  const timelineRef = useRef(null);
  const orbitControlsRef = useRef();

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

  const handlePlayAnimation = useCallback(({ initialState, steps }) => {
    console.log("handlePlayAnimation called with:", { initialState, steps });
    console.log("orbitControlsRef:", orbitControlsRef.current);
    if (!iphoneRef.current || !cameraControlRef.current) {
      console.error("Refs missing:", {
        iphone: !!iphoneRef.current,
        controls: !!cameraControlRef.current,
      });
      return;
    }

    // Kill previous timeline if it exists
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    // Explicitly stop any running tweens on the objects
    if (iphoneRef.current.stop) iphoneRef.current.stop();
    if (cameraControlRef.current.stop) cameraControlRef.current.stop();

    // 1. Set Initial State
    iphoneRef.current.set({ position: initialState.phone });
    cameraControlRef.current.set({
      position: initialState.camera.position,
      rotation: initialState.camera.rotation,
      up: initialState.cameraUp || { x: 0, y: 1, z: 0 },
    });

    if (orbitControlsRef.current) {
      // Disable controls during animation to prevent conflict
      orbitControlsRef.current.enabled = false;
      const target = initialState.target || { x: 0, y: 0, z: 0 };
      orbitControlsRef.current.target.set(target.x, target.y, target.z);
      orbitControlsRef.current.update();
    }

    // 2. Create Master Timeline
    const masterTl = gsap.timeline({
      onComplete: () => {
        // Re-enable controls after animation
        if (orbitControlsRef.current) {
          orbitControlsRef.current.enabled = true;
          orbitControlsRef.current.update();
        }
      },
    });
    timelineRef.current = masterTl;

    // 3. Add Steps
    steps.forEach((step) => {
      const stepTl = gsap.timeline();

      const phoneAnim = iphoneRef.current.move({ position: step.phone }, step.duration, step.ease);

      const cameraAnim = cameraControlRef.current.move(
        {
          position: step.camera.position,
          // rotation: step.camera.rotation, // Removed to prevent conflict with lookAt
          up: step.cameraUp,
        },
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
            onUpdate: () => {
              if (cameraControlRef.current && orbitControlsRef.current) {
                cameraControlRef.current.lookAt(orbitControlsRef.current.target);
              }
            },
          },
          0
        );
      }

      masterTl.add(stepTl, "+=" + (step.delay || 0));
    });
  }, []);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const handleStartRecording = useCallback(async () => {
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
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);
  const handleCapture = useCallback(() => {
    const phoneState = iphoneRef.current ? iphoneRef.current.getState() : null;
    const cameraState = cameraControlRef.current ? cameraControlRef.current.getState() : null;
    const target = orbitControlsRef.current
      ? orbitControlsRef.current.target
      : { x: 0, y: 0, z: 0 };

    return {
      phone: phoneState ? phoneState.position : { x: 0, y: 0, z: 0 },
      camera: cameraState
        ? { position: cameraState.position, rotation: cameraState.rotation }
        : { position: { x: 0, y: 0, z: 25 }, rotation: { x: 0, y: 0, z: 0 } },
      cameraUp: cameraState && cameraState.up ? cameraState.up : { x: 0, y: 1, z: 0 },
      target: { x: target.x, y: target.y, z: target.z },
    };
  }, []);

  const handleQuickRotate = useCallback(() => {
    if (iphoneRef.current) {
      iphoneRef.current.quickRotate(quickRotationDegrees);
    }
  }, [quickRotationDegrees]);

  const handleBringMeBack = useCallback(() => {
    if (cameraControlRef.current) {
      cameraControlRef.current.move(
        {
          position: { x: 0, y: 0, z: 15 },
          rotation: { x: 0, y: 0, z: 0 },
          up: { x: 0, y: 1, z: 0 },
        },
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
      // Disable controls during reset
      orbitControlsRef.current.enabled = false;

      // Animate target back to 0,0,0
      gsap.to(orbitControlsRef.current.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.5,
        ease: "power3.out",
        onComplete: () => {
          // Re-enable controls and reset internal state if needed
          orbitControlsRef.current.enabled = true;
          orbitControlsRef.current.update();
        },
      });
    }
  }, []);

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
            <Iphone
              ref={iphoneRef}
              scale={[0.5, 0.5, 0.5]}
              isSpinning={isSpinning}
              spinSpeed={spinSpeed}
            />
            <Environment preset="city" />
          </Suspense>

          <ContactShadows position={[0, -2.5, 0]} opacity={0.6} scale={10} blur={2} far={5} />
          <ArcballControls
            ref={orbitControlsRef}
            makeDefault
            enableZoom={false}
            enablePan={true}
            dampingFactor={15}
            gizmosVisible={false}
          />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport axisColors={["#9d4b4b", "#2f7f4f", "#3b5b9d"]} labelColor="white" />
          </GizmoHelper>
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
      <MainUI
        uiWidth={uiWidth}
        setUiWidth={setUiWidth}
        showUI={showUI}
        setShowUI={setShowUI}
        currentTheme={currentTheme}
        setCurrentTheme={setCurrentTheme}
        customColor={customColor}
        setCustomColor={setCustomColor}
        isSpinning={isSpinning}
        setIsSpinning={setIsSpinning}
        spinSpeed={spinSpeed}
        setSpinSpeed={setSpinSpeed}
        quickRotationDegrees={quickRotationDegrees}
        setQuickRotationDegrees={setQuickRotationDegrees}
        onQuickRotate={handleQuickRotate}
        onBringMeBack={handleBringMeBack}
        onPlayAnimation={handlePlayAnimation}
        onCapture={handleCapture}
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />
    </div>
  );
}

export default App;
