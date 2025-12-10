import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, Html, RoundedBox, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Muxer, ArrayBufferTarget } from "webm-muxer";
import LightRaysBackground from "./LightRaysBackground";
import "./Slider3D.css";

function SliderRing({ rotationRef, isRendering, isFloating }) {
  const baseUrl = import.meta.env.BASE_URL;
  const { gl } = useThree();
  const count = 10;
  const images = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => `${baseUrl}images/slider3d/tattoony/${i + 1}.jpg`),
    [baseUrl]
  );
  const textures = useTexture(images);
  const logoTexture = useTexture(`${baseUrl}images/slider3d/tattoony/tattoomii logo_white.svg`);

  useEffect(() => {
    textures.forEach((texture) => {
      texture.anisotropy = gl.capabilities.getMaxAnisotropy();
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
    });
    logoTexture.anisotropy = gl.capabilities.getMaxAnisotropy();
    logoTexture.minFilter = THREE.LinearMipmapLinearFilter;
    logoTexture.magFilter = THREE.LinearFilter;
    logoTexture.needsUpdate = true;
  }, [textures, logoTexture, gl]);

  // Responsive logic
  const { width } = useThree((state) => state.viewport);
  const [config, setConfig] = useState({ w: 210, h: 280, radius: 550 });

  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth;
      if (w <= 767) {
        setConfig({ w: 126, h: 168, radius: 260 });
      } else if (w <= 1023) {
        setConfig({ w: 154, h: 205, radius: 300 });
      } else {
        setConfig({ w: 210, h: 280, radius: 400 });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useFrame((state, delta) => {
    if (!isRendering && rotationRef.current) {
      rotationRef.current.rotation.y += delta * ((Math.PI * 2) / 20);
    }
  });

  return (
    <group rotation={[(-20 * Math.PI) / 180, 0, 0]}>
      <group ref={rotationRef}>
        {textures.map((tex, i) => (
          <Card
            key={i}
            texture={tex}
            logoTexture={logoTexture}
            index={i}
            count={count}
            radius={config.radius}
            isFloating={isFloating}
            width={config.w}
            height={config.h}
          />
        ))}
      </group>
    </group>
  );
}

function Card({ texture, logoTexture, index, count, radius, isFloating, width, height }) {
  const groupRef = useRef();

  // Calculate Ring Position/Rotation
  const ringState = useMemo(() => {
    const angle = (index / count) * Math.PI * 2;
    // In the original code, the parent group was rotated by 'angle', and the child was at 'radius' on Z.
    // This corresponds to:
    // x = radius * sin(angle)
    // z = radius * cos(angle)
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    return {
      position: new THREE.Vector3(x, 0, z),
      rotation: new THREE.Euler(0, angle, 0),
    };
  }, [index, count, radius]);

  // Calculate Floating Position/Rotation (Random)
  const floatState = useMemo(() => {
    return {
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 1500,
        (Math.random() - 0.5) * 800,
        (Math.random() - 0.5) * 800
      ),
      rotation: new THREE.Euler(Math.random() * Math.PI * 0.5, Math.random() * Math.PI * 2, 0),
    };
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const targetPos = isFloating ? floatState.position : ringState.position;
    const targetRot = isFloating ? floatState.rotation : ringState.rotation;

    // Smoothly interpolate position
    groupRef.current.position.lerp(targetPos, delta * 2);

    // Smoothly interpolate rotation
    const targetQuaternion = new THREE.Quaternion().setFromEuler(targetRot);
    groupRef.current.quaternion.slerp(targetQuaternion, delta * 2);

    // Add gentle hovering motion when floating
    if (isFloating) {
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime + index * 100) * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Frame/Body */}
      <RoundedBox args={[width, height, 5]} radius={10} smoothness={4}>
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.5} />
      </RoundedBox>
      {/* Image Face (Front) */}
      <mesh position={[0, 0, 3.2]}>
        <planeGeometry args={[width - 10, height - 10]} />
        <meshBasicMaterial map={texture} side={THREE.FrontSide} />
      </mesh>
      {/* Image Face (Back) */}
      <mesh position={[0, 0, -3.2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width * 0.8, (width * 0.8) / 6]} />
        <meshBasicMaterial map={logoTexture} side={THREE.FrontSide} transparent={true} />
      </mesh>
    </group>
  );
}

function Recorder({ recording, config, onComplete, onProgress, rotationRef, lightRaysRef }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (!recording) return;

    let aborted = false;

    const renderVideo = async () => {
      try {
        const { width, height, fps, duration } = config;
        const totalFrames = Math.ceil(duration * fps);

        console.log(`Starting render: ${width}x${height} @ ${fps}fps, ${totalFrames} frames`);

        // Save original state
        const originalSize = new THREE.Vector2();
        gl.getSize(originalSize);
        const originalPixelRatio = gl.getPixelRatio();

        // Configure for recording
        gl.setSize(width, height);
        gl.setPixelRatio(1);

        const muxer = new Muxer({
          target: new ArrayBufferTarget(),
          video: {
            codec: "V_VP9",
            width,
            height,
            frameRate: fps,
          },
        });

        const videoEncoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (e) => console.error("VideoEncoder error:", e),
        });

        await videoEncoder.configure({
          codec: "vp09.00.10.08",
          width,
          height,
          bitrate: 30_000_000, // 10 Mbps
          framerate: fps,
        });

        for (let i = 0; i < totalFrames; i++) {
          if (aborted) return;

          const time = i / fps;

          // Update animation state
          if (rotationRef.current) {
            // Match the CSS animation speed: 1 rotation per 20 seconds
            const angle = (time / 20) * Math.PI * 2;
            rotationRef.current.rotation.y = angle;
          }

          // Update Light Rays Background
          if (lightRaysRef.current) {
            lightRaysRef.current.updateUniforms(time, width, height);
          }

          // Render
          gl.render(scene, camera);

          // Create frame from canvas
          const frame = new VideoFrame(gl.domElement, {
            timestamp: i * (1000000 / fps),
          });

          // Encode
          const keyFrame = i % fps === 0; // Keyframe every second
          videoEncoder.encode(frame, { keyFrame });
          frame.close();

          if (onProgress && i % 5 === 0) {
            onProgress(Math.round((i / totalFrames) * 100));
          }

          // Prevent overwhelming the encoder
          while (videoEncoder.encodeQueueSize > 2) {
            await new Promise((r) => setTimeout(r, 10));
          }

          // Optional: Yield to UI to prevent freezing completely (though it will still be heavy)
          await new Promise((r) => setTimeout(r, 0));
        }

        if (aborted) return;

        await videoEncoder.flush();
        muxer.finalize();

        const { buffer } = muxer.target;
        const blob = new Blob([buffer], { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        // Download
        const a = document.createElement("a");
        a.href = url;
        a.download = `slider-3d-${width}x${height}-${fps}fps.webm`;
        a.click();
        URL.revokeObjectURL(url);

        // Restore state
        gl.setSize(originalSize.x, originalSize.y);
        gl.setPixelRatio(originalPixelRatio);

        onComplete();
      } catch (err) {
        console.error("Recording failed:", err);
        onComplete();
      }
    };

    renderVideo();

    return () => {
      aborted = true;
    };
  }, [recording]);

  return null;
}

function CameraResetter({ trigger }) {
  const { controls } = useThree();
  useEffect(() => {
    if (controls && trigger > 0) {
      controls.reset();
    }
  }, [trigger, controls]);
  return null;
}

export function Slider3D({ onBack }) {
  const baseUrl = import.meta.env.BASE_URL;
  const [showUI, setShowUI] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [renderConfig, setRenderConfig] = useState({
    width: 1920,
    height: 1080,
    fps: 60,
    duration: 20, // Full loop
  });

  const rotationRef = useRef();
  const lightRaysRef = useRef();
  const timerRef = useRef(null);

  const resetTimer = () => {
    if (isRecording) return;
    setShowUI(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowUI(false);
    }, 3000);
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleStartRecording = () => {
    setIsRecording(true);
    setProgress(0);
    setShowUI(false);
  };

  const handleRecordingComplete = () => {
    setIsRecording(false);
    setShowUI(true);
  };

  return (
    <div
      className="slider3d-wrapper"
      onMouseMove={resetTimer}
      onTouchStart={resetTimer}
      onClick={resetTimer}>
      {/* Controls UI */}
      <div className={`slider3d-controls ${showUI && !isRecording ? "" : "hidden"}`}>
        <button className="slider3d-btn back-btn" onClick={onBack}>
          Back
        </button>
        <button className="slider3d-btn" onClick={() => setResetTrigger((t) => t + 1)}>
          Reset View
        </button>
        <button className="slider3d-btn" onClick={() => setIsFloating(!isFloating)}>
          {isFloating ? "Ring Mode" : "Float Mode"}
        </button>

        <div className="render-controls">
          <select
            value={renderConfig.height}
            onChange={(e) => {
              const h = parseInt(e.target.value);
              const w = h === 1080 ? 1920 : h === 2160 ? 3840 : 1280;
              setRenderConfig({ ...renderConfig, width: w, height: h });
            }}
            className="slider3d-select">
            <option value={720}>720p</option>
            <option value={1080}>1080p</option>
            <option value={2160}>4K</option>
          </select>

          <select
            value={renderConfig.fps}
            onChange={(e) => setRenderConfig({ ...renderConfig, fps: parseInt(e.target.value) })}
            className="slider3d-select">
            <option value={30}>30 FPS</option>
            <option value={60}>60 FPS</option>
          </select>

          <button className="slider3d-btn record-btn" onClick={handleStartRecording}>
            Render Video
          </button>
        </div>
      </div>

      {/* Loading / Recording Indicator */}
      {isRecording && (
        <div className="recording-overlay">
          <div className="recording-content">
            <div className="recording-text">Rendering Video...</div>
            <div className="recording-progress-container">
              <div className="recording-progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="recording-status">{progress}% Complete</div>
            <button
              className="slider3d-btn record-btn"
              style={{ marginTop: "20px", pointerEvents: "auto" }}
              onClick={() => setIsRecording(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 200, 1000], fov: 50, near: 10, far: 4000 }}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 2 }}
        gl={{ preserveDrawingBuffer: true, logarithmicDepthBuffer: true }}>
        <Suspense
          fallback={
            <Html>
              <div style={{ color: "white" }}>Loading...</div>
            </Html>
          }>
          <ambientLight intensity={1.5} />
          <directionalLight position={[0, 0, 2000]} intensity={2} />
          <Environment preset="city" />
          <LightRaysBackground
            ref={lightRaysRef}
            raysColor="#ffffff"
            raysSpeed={0.7}
            lightSpread={0.3}
            rayLength={0.5}
            pulsating={false}
            fadeDistance={1.2}
            saturation={1}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0}
            distortion={0}
          />
          <SliderRing rotationRef={rotationRef} isRendering={isRecording} isFloating={isFloating} />
          <OrbitControls makeDefault enableZoom={true} enablePan={true} />
          <CameraResetter trigger={resetTrigger} />
        </Suspense>
        <Recorder
          recording={isRecording}
          config={renderConfig}
          onComplete={handleRecordingComplete}
          onProgress={setProgress}
          rotationRef={rotationRef}
          lightRaysRef={lightRaysRef}
        />
      </Canvas>
    </div>
  );
}
