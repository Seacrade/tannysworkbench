import React, { useRef, useLayoutEffect, forwardRef, useImperativeHandle } from "react";
import { useGLTF, Html } from "@react-three/drei";
import gsap from "gsap";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const Iphone = forwardRef(({ isSpinning, ...props }, ref) => {
  const { scene } = useGLTF("/models/iphone_16/scene.gltf");
  const internalRef = useRef();
  const htmlRef = useRef();
  const vectors = useRef({
    forward: new THREE.Vector3(),
    cameraToPhone: new THREE.Vector3(),
    worldPos: new THREE.Vector3(),
    worldQuat: new THREE.Quaternion(),
  });

  useImperativeHandle(ref, () => ({
    set: (config) => {
      if (!internalRef.current) return;
      if (config.position) {
        internalRef.current.position.set(config.position.x, config.position.y, config.position.z);
      }
      if (config.rotation) {
        internalRef.current.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
      }
    },
    move: (config, duration, ease) => {
      if (!internalRef.current) return null;
      const tl = gsap.timeline();

      if (config.position) {
        tl.to(
          internalRef.current.position,
          {
            x: config.position.x,
            y: config.position.y,
            z: config.position.z,
            duration: duration,
            ease: ease,
          },
          0
        );
      }
      if (config.rotation) {
        tl.to(
          internalRef.current.rotation,
          {
            x: config.rotation.x,
            y: config.rotation.y,
            z: config.rotation.z,
            duration: duration,
            ease: ease,
          },
          0
        );
      }
      return tl;
    },
    animate: (config) => {
      if (!internalRef.current) return;

      // Kill existing animations
      gsap.killTweensOf(internalRef.current.position);
      gsap.killTweensOf(internalRef.current.rotation);

      // Set initial state
      if (config.from) {
        if (config.from.position) {
          internalRef.current.position.set(
            config.from.position.x,
            config.from.position.y,
            config.from.position.z
          );
        }
        if (config.from.rotation) {
          internalRef.current.rotation.set(
            config.from.rotation.x,
            config.from.rotation.y,
            config.from.rotation.z
          );
        }
      }

      // Animate to target
      if (config.to) {
        if (config.to.position) {
          gsap.to(internalRef.current.position, {
            x: config.to.position.x,
            y: config.to.position.y,
            z: config.to.position.z,
            duration: config.duration,
            ease: config.ease,
          });
        }
        if (config.to.rotation) {
          gsap.to(internalRef.current.rotation, {
            x: config.to.rotation.x,
            y: config.to.rotation.y,
            z: config.to.rotation.z,
            duration: config.duration,
            ease: config.ease,
          });
        }
      }
    },
    getState: () => {
      if (!internalRef.current) return null;
      return {
        position: {
          x: internalRef.current.position.x,
          y: internalRef.current.position.y,
          z: internalRef.current.position.z,
        },
        rotation: {
          x: internalRef.current.rotation.x,
          y: internalRef.current.rotation.y,
          z: internalRef.current.rotation.z,
        },
      };
    },
  }));

  // Access the camera and scene if needed for complex animations
  const { camera } = useThree();

  useLayoutEffect(() => {
    // Change phone color to Space Grey
    const blueMaterialNames = [
      "3b9594ccffa1d862f699",
      "b23162de4d8409eb15f1",
      "cecc91181f1dafcc19fa",
      "299a045923a299d97c82",
      "82823ff934002f16e6e0",
      "b4ad12de1fcbdd61166e",
      "ec12d37933cc378c1226",
      "bfb52a03e58fd454437d",
      "d79c406d92ac2ea2b462",
      "dee5a626f928a5fa4c28",
      "906edd797edf30e1b5ca",
      "c306087c056eb775dddc",
      "4a6c96a0e91c63810afa",
      "4e2775e8ab652e8ec892",
      "b8c5608ba04260006bf0",
      "6a2b4bcac74a0306e361",
      "f960f58dcaeee45e59c1",
      "8293fe999d10eb51dc07",
      "2df164b7997e629e4d7e",
    ];

    scene.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        if (blueMaterialNames.includes(obj.material.name)) {
          obj.material.color.set("#535150"); // Space Grey
          obj.material.roughness = 0.2;
          obj.material.metalness = 0.8;
        }
      }
    });

    // This is where you can prepare your GSAP animations
    // Example: Rotate the phone on mount
    if (internalRef.current) {
      gsap.fromTo(
        internalRef.current.rotation,
        { y: -Math.PI },
        { y: 0, duration: 1.5, ease: "power3.out" }
      );

      gsap.fromTo(
        internalRef.current.position,
        { y: -0.2 },
        { y: 0, duration: 1.5, ease: "power3.out" }
      );
    }
  }, []);

  useFrame((state, delta) => {
    if (isSpinning && internalRef.current) {
      internalRef.current.rotation.y += delta * 0.5;
    }

    if (internalRef.current && htmlRef.current) {
      const { forward, cameraToPhone, worldPos, worldQuat } = vectors.current;

      internalRef.current.getWorldPosition(worldPos);
      internalRef.current.getWorldQuaternion(worldQuat);

      // Phone's forward vector (Z-axis)
      forward.set(0, 0, 1).applyQuaternion(worldQuat);

      // Vector from camera to phone
      cameraToPhone.subVectors(worldPos, state.camera.position).normalize();

      // Dot product: -1 (facing camera) to 1 (facing away)
      const dot = forward.dot(cameraToPhone);

      // Hide when approaching 90 degrees (side view)
      // dot = 0 is exactly 90 degrees.
      // dot > -0.03 starts fading slightly before 90 degrees.
      const isVisible = dot < -0.03;

      htmlRef.current.style.opacity = isVisible ? 1 : 0;
      htmlRef.current.style.pointerEvents = isVisible ? "auto" : "none";
      htmlRef.current.style.transition = "opacity 0.1s";
    }
  });

  return (
    <group ref={internalRef} {...props}>
      <primitive object={scene} />
      <Html
        ref={htmlRef}
        transform
        wrapperClass="htmlScreen"
        position={[0, 0, 0.4]}
        scale={0.69}
        rotation={[0, 0, 0]}>
        <iframe
          src="https://tattoomii.com"
          style={{
            width: "380px",
            height: "825px",
            border: "none",
            borderRadius: "60px",
            background: "black",
          }}
        />
      </Html>
    </group>
  );
});

useGLTF.preload("/models/iphone_16/scene.gltf");
