import { useThree } from "@react-three/fiber";
import { forwardRef, useImperativeHandle } from "react";
import gsap from "gsap";

export const SceneController = forwardRef((props, ref) => {
  const { camera } = useThree();

  useImperativeHandle(ref, () => ({
    set: (config) => {
      if (config.position) {
        camera.position.set(config.position.x, config.position.y, config.position.z);
      }
      if (config.rotation) {
        camera.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
      }
    },
    stop: () => {
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(camera.rotation);
    },
    move: (config, duration, ease) => {
      const tl = gsap.timeline();
      if (config.position) {
        tl.to(
          camera.position,
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
          camera.rotation,
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
      // Kill existing animations
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(camera.rotation);

      // Set initial state
      if (config.from) {
        if (config.from.position) {
          camera.position.set(
            config.from.position.x,
            config.from.position.y,
            config.from.position.z
          );
        }
        if (config.from.rotation) {
          camera.rotation.set(
            config.from.rotation.x,
            config.from.rotation.y,
            config.from.rotation.z
          );
        }
      }

      // Animate to target
      if (config.to) {
        if (config.to.position) {
          gsap.to(camera.position, {
            x: config.to.position.x,
            y: config.to.position.y,
            z: config.to.position.z,
            duration: config.duration,
            ease: config.ease,
          });
        }
        if (config.to.rotation) {
          gsap.to(camera.rotation, {
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
      return {
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        rotation: {
          x: camera.rotation.x,
          y: camera.rotation.y,
          z: camera.rotation.z,
        },
      };
    },
  }));

  return null;
});
