import { useState, useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import { Iphone } from "./components/Iphone";
import { AnimationControls } from "./components/AnimationControls";
import { SceneController } from "./components/SceneController";
import gsap from "gsap";
import "./App.css";

function App() {
  const [isSpinning, setIsSpinning] = useState(false);
  const iphoneRef = useRef();
  const cameraControlRef = useRef();
  const timelineRef = useRef(null);

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
        <Canvas camera={{ position: [0, 0, 25], fov: 45 }}>
          <color attach="background" args={["#111"]} />
          <ambientLight intensity={0.5} />
          <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} />

          <SceneController ref={cameraControlRef} />
          <Iphone ref={iphoneRef} scale={[0.5, 0.5, 0.5]} isSpinning={isSpinning} />

          <ContactShadows position={[0, -0.15, 0]} opacity={0.4} scale={1} blur={2.5} far={4} />
          <Environment preset="city" />
          <OrbitControls enableZoom={true} enablePan={true} />
        </Canvas>
      </div>
      <div className="ui-overlay">
        <h1>tattoomii.</h1>
        <p>Tannys Playground</p>
        <div className="controls">
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
