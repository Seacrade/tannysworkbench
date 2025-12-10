import React, { useState, useEffect, useRef, useMemo, Suspense, useLayoutEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, Html, RoundedBox, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Muxer, ArrayBufferTarget } from "webm-muxer";
import gsap from "gsap";
import LightRaysBackground from "./LightRaysBackground";
import "./Slider3D.css";

function SliderRing({ isRendering, isFloating, config }) {
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

  return (
    <group rotation={[0, 0, 0]}>
      <group>
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

function CameraRig({ timelineRef, config, isRendering, isFreeView }) {
  const { camera, controls } = useThree();
  const count = 10;

  useLayoutEffect(() => {
    if (!config) return;

    const tl = gsap.timeline({ paused: true, repeat: -1 });
    timelineRef.current = tl;

    const fovRad = (camera.fov * Math.PI) / 180;
    // Calculate distance to fit the card height
    const dist = (config.h * 1.2) / (2 * Math.tan(fovRad / 2));
    const camRadius = config.radius + dist;

    // Proxy object to hold animation values
    const proxy = {
      angle: 0,
      radiusMult: 1,
      y: 0,
      tilt: 0,
      lookAtRadiusMult: 1, // 1 = Look at ring, 0 = Look at center
      rotateY: 0, // Additional Y rotation for turning around
    };

    tl.set(proxy, {
      angle: 0,
      radiusMult: 1,
      y: 0,
      tilt: 0,
      lookAtRadiusMult: 1,
      rotateY: 0,
    });

    // Define the sequence of cards to visit
    // 0 -> 1 (Normal)
    // 1 -> 2 (Normal)
    // 2 -> 4 (Skip 3 - Jump)
    // 4 -> 5 (Normal)
    // 5 -> 9 (Fast Spin - 4 cards)
    // End at 9, then dive
    const stops = [0, 1, 2, 4, 5, 9];

    let currentAngle = 0;

    for (let i = 0; i < stops.length - 1; i++) {
      const currentIndex = stops[i];
      const nextIndex = stops[i + 1];

      // Calculate distance (number of steps forward)
      let stepCount = nextIndex - currentIndex;
      if (stepCount < 0) stepCount += count; // Handle wrap (e.g. 9 -> 0 is -9 + 10 = 1)

      const targetAngle = currentAngle + (stepCount / count) * Math.PI * 2;

      // --- PHASE 1: FOCUS (Stay on card with subtle drift) ---
      // Apple motion: Never perfectly static. Slow drift.
      tl.to(proxy, {
        angle: currentAngle + 0.02, // Very slight drift
        y: config.h * 0.05, // Slight vertical drift
        duration: 2,
        ease: "sine.inOut",
      });

      // --- PHASE 2: TRANSITION ---
      const label = `transition-${i}`;
      tl.addLabel(label);

      if (i === 3) {
        // Special "Zoom & Spin" transition (4 -> 5)
        // 1. Zoom Out (Wind up)
        tl.to(
          proxy,
          {
            radiusMult: 2.5, // Zoom out less far
            duration: 1.0,
            ease: "power2.inOut",
          },
          label
        );

        // 2. Spin Fast (Stay zoomed out)
        const spinAngle = targetAngle + Math.PI * 4;

        tl.to(
          proxy,
          {
            angle: spinAngle,
            duration: 1.5,
            ease: "expo.inOut",
          },
          `${label}+=0.8`
        );

        // 3. Wait & Zoom In
        tl.to(
          proxy,
          {
            radiusMult: 1.0,
            duration: 1.0,
            ease: "power3.inOut",
          },
          `-=${0.7}`
        ); // Overlap end of spin to make it snappy

        currentAngle = spinAngle;
        continue;
      }

      // Determine duration based on distance
      // Apple motion: Fast, snappy, but smooth.
      let moveDuration = 2.0; // Faster base speed
      let pullBackAmt = 1.8; // Less extreme pull back, more controlled

      if (i === 1) {
        // 1 -> 2 (The 2nd transition)
        pullBackAmt = 1.0; // No zoom out
        moveDuration = 1.8; // Snappy
      } else if (stepCount === 2) {
        moveDuration = 2.4;
        pullBackAmt = 2.2;
      } else if (stepCount >= 3) {
        moveDuration = 2.8;
        pullBackAmt = 2.8;
      }

      // 1. Main Rotation (The travel)
      // expo.inOut gives that "Apple" feel: Slow start, very fast middle, slow end.
      tl.to(
        proxy,
        {
          angle: targetAngle,
          duration: moveDuration,
          ease: "expo.inOut",
        },
        label
      );

      // 2. Radius Swoop (Pull back to see context)
      if (pullBackAmt > 1.0) {
        tl.to(
          proxy,
          {
            radiusMult: pullBackAmt,
            duration: moveDuration * 0.5,
            ease: "power3.out", // Fast out
          },
          label
        );

        tl.to(
          proxy,
          {
            radiusMult: 1, // Return to focus distance
            duration: moveDuration * 0.5,
            ease: "expo.inOut", // Smooth, snappy landing
          },
          `${label}+=${moveDuration * 0.5}`
        );
      }

      // 3. Vertical Swoop (Cinematic motion)
      // Reduced amplitude for more elegance
      const yDir = i % 2 === 0 ? 1 : -1;
      let yPeak = config.h * (stepCount > 1 ? 1.2 : 0.8);
      if (i === 1) yPeak = 0; // No vertical swoop for 2nd transition

      tl.to(
        proxy,
        {
          y: yPeak * yDir,
          duration: moveDuration * 0.5,
          ease: "power2.inOut",
        },
        label
      );

      tl.to(
        proxy,
        {
          y: 0,
          duration: moveDuration * 0.5,
          ease: "power3.out", // Soft landing
        },
        `${label}+=${moveDuration * 0.5}`
      );

      // 4. Dutch Angle / Tilt (Dynamic feel)
      // Tilt into the turn
      let tiltAmt = (stepCount > 1 ? 0.2 : 0.1) * yDir;
      if (i === 1) tiltAmt = 0; // No tilt for 2nd transition

      tl.to(
        proxy,
        {
          tilt: tiltAmt,
          duration: moveDuration * 0.5,
          ease: "power2.inOut",
        },
        label
      );

      tl.to(
        proxy,
        {
          tilt: 0,
          duration: moveDuration * 0.5,
          ease: "power2.inOut",
        },
        `${label}+=${moveDuration * 0.5}`
      );

      currentAngle = targetAngle;
    }

    // Drift on the final card before ending sequence
    tl.to(proxy, {
      angle: currentAngle + 0.02,
      y: config.h * 0.05,
      duration: 2,
      ease: "sine.inOut",
    });

    // --- PHASE 3: ENDING (Show Back of Card) ---
    const endLabel = "show-back";
    tl.addLabel(endLabel);

    // Calculate inside radius to maintain same viewing distance
    // camRadius = config.radius + dist (Outside)
    // targetRadius = config.radius - dist (Inside)
    // We pull back further inside (dist * 1.5) to avoid feeling too close/clipping
    const insideDist = Math.max(10, config.radius - dist * 1.5);
    const insideMult = insideDist / camRadius;
    const nextCardAngle = currentAngle + (Math.PI * 2) / count;

    // 1. Level Out & Look at Center (Prepare for dive)
    tl.to(
      proxy,
      {
        lookAtRadiusMult: 0,
        y: 0,
        tilt: 0,
        duration: 1.0,
        ease: "power2.inOut",
      },
      endLabel
    );

    // 2. Move to Next Card (Continuous motion through gap)
    // We move from current card -> gap -> next card (back)
    tl.to(
      proxy,
      {
        angle: nextCardAngle,
        duration: 3.0,
        ease: "power1.inOut", // Softer ease to keep moving through gap
      },
      endLabel
    );

    // 3. Dive Through (Go inside)
    // Timed to cross the ring when we are at the gap (midpoint of angle move)
    tl.to(
      proxy,
      {
        radiusMult: insideMult,
        duration: 2.0,
        ease: "power2.inOut",
      },
      `${endLabel}+=0.5`
    );

    // 4. Look back at the ring (outward) as we arrive at next card
    // We rotate the camera 180 degrees to look outward, instead of moving the target
    // This avoids the "singularity" glitch where the target passes through the camera
    tl.to(
      proxy,
      {
        rotateY: Math.PI,
        duration: 1.5,
        ease: "power2.inOut",
      },
      `${endLabel}+=2.0`
    );

    // Stay there for a moment with drift
    tl.to(proxy, {
      angle: nextCardAngle,
      duration: 3,
      ease: "sine.inOut",
    });

    // Animation loop to update camera
    const updateCamera = () => {
      const angle = proxy.angle;
      const r = camRadius * proxy.radiusMult;

      const x = Math.sin(angle) * r;
      const z = Math.cos(angle) * r;
      const y = proxy.y;

      // Look at the target card's position (or center)
      // Interpolate between looking at ring (radius) and center (0)
      const lookR = config.radius * proxy.lookAtRadiusMult;
      const lookX = Math.sin(angle) * lookR;
      const lookZ = Math.cos(angle) * lookR;

      camera.position.set(x, y, z);
      camera.lookAt(lookX, 0, lookZ);

      // Apply extra rotations
      // rotateY allows us to turn around (look outward) without moving the lookAt target
      if (proxy.rotateY) camera.rotateY(proxy.rotateY);
      camera.rotateZ(proxy.tilt);

      // if (controls) {
      //     controls.target.set(lookX, 0, lookZ);
      //     controls.update();
      // }
    };

    timelineRef.proxy = proxy;
    timelineRef.updateCamera = updateCamera;

    if (!isRendering && !isFreeView) {
      tl.play();
    }

    return () => {
      tl.kill();
    };
  }, [config, camera, count, isRendering, controls]);

  // Handle Play/Pause for Free View
  useEffect(() => {
    if (!timelineRef.current) return;

    if (isFreeView) {
      timelineRef.current.pause();
    } else {
      if (!isRendering) {
        timelineRef.current.play();
      }
    }
  }, [isFreeView, isRendering]);

  useFrame(() => {
    if (!isFreeView && timelineRef.updateCamera) {
      timelineRef.updateCamera();
    }
  });

  return null;
}

function Recorder({ recording, config, onComplete, onProgress, timelineRef, lightRaysRef }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (!recording) return;

    let aborted = false;

    const renderVideo = async () => {
      try {
        const { width, height, fps } = config;
        // Use timeline duration
        const duration = timelineRef.current ? timelineRef.current.duration() : config.duration;
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
          bitrate: 30_000_000, // 30 Mbps
          framerate: fps,
        });

        // Pause timeline for manual control
        if (timelineRef.current) timelineRef.current.pause();

        for (let i = 0; i < totalFrames; i++) {
          if (aborted) return;

          const time = i / fps;

          // Update animation state
          if (timelineRef.current) {
            timelineRef.current.seek(time);
            // Force update camera
            if (timelineRef.updateCamera) timelineRef.updateCamera();
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

        // Resume timeline
        if (timelineRef.current) timelineRef.current.play();

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
  const [isFreeView, setIsFreeView] = useState(false);
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
  const timelineRef = useRef();
  const timerRef = useRef(null);

  // Responsive logic moved here
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
        <button className="slider3d-btn" onClick={() => setIsFreeView(!isFreeView)}>
          {isFreeView ? "Animation Mode" : "Free View"}
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
        camera={{ position: [0, 300, 1000], fov: 50, near: 10, far: 4000 }}
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
            raysColor="#ffc880"
            backgroundColor="#111111"
            raysSpeed={0.4}
            lightSpread={0.6}
            rayLength={0.8}
            pulsating={true}
            fadeDistance={1.2}
            saturation={1}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0}
            distortion={0}
          />
          <SliderRing
            rotationRef={rotationRef}
            isRendering={isRecording}
            isFloating={isFloating}
            config={config}
          />
          <CameraRig
            timelineRef={timelineRef}
            config={config}
            isRendering={isRecording}
            isFreeView={isFreeView}
          />
          <OrbitControls
            makeDefault
            enableZoom={true}
            enablePan={true}
            enabled={!isRecording && isFreeView}
          />
          <CameraResetter trigger={resetTrigger} />
        </Suspense>
        <Recorder
          recording={isRecording}
          config={renderConfig}
          onComplete={handleRecordingComplete}
          onProgress={setProgress}
          rotationRef={rotationRef}
          lightRaysRef={lightRaysRef}
          timelineRef={timelineRef}
        />
      </Canvas>
    </div>
  );
}
