import React, { useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const getAnchorAndDir = (raysOrigin, w, h) => {
  const outside = 0.2;
  let anchor = [0.5 * w, -outside * h];
  let dir = [0, 1];

  switch (raysOrigin) {
    case "top-left":
      anchor = [0, -outside * h];
      dir = [0, 1];
      break;
    case "top-right":
      anchor = [w, -outside * h];
      dir = [0, 1];
      break;
    case "left":
      anchor = [-outside * w, 0.5 * h];
      dir = [1, 0];
      break;
    case "right":
      anchor = [(1 + outside) * w, 0.5 * h];
      dir = [-1, 0];
      break;
    case "bottom-left":
      anchor = [0, (1 + outside) * h];
      dir = [0, -1];
      break;
    case "bottom-center":
      anchor = [0.5 * w, (1 + outside) * h];
      dir = [0, -1];
      break;
    case "bottom-right":
      anchor = [w, (1 + outside) * h];
      dir = [0, -1];
      break;
    case "top-center":
    default:
      anchor = [0.5 * w, -outside * h];
      dir = [0, 1];
      break;
  }
  return { anchor, dir };
};

const LightRaysBackground = forwardRef(
  (
    {
      raysOrigin = "top-center",
      raysColor = "#ffffff",
      raysSpeed = 1,
      lightSpread = 1,
      rayLength = 2,
      pulsating = false,
      fadeDistance = 1.0,
      saturation = 1.0,
      followMouse = true,
      mouseInfluence = 0.1,
      noiseAmount = 0.0,
      distortion = 0.0,
    },
    ref
  ) => {
    const meshRef = useRef();
    const { size, pointer } = useThree();

    const uniforms = useMemo(
      () => ({
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2() },
        rayPos: { value: new THREE.Vector2() },
        rayDir: { value: new THREE.Vector2() },
        raysColor: { value: new THREE.Color(raysColor) },
        raysSpeed: { value: raysSpeed },
        lightSpread: { value: lightSpread },
        rayLength: { value: rayLength },
        pulsating: { value: pulsating ? 1.0 : 0.0 },
        fadeDistance: { value: fadeDistance },
        saturation: { value: saturation },
        mousePos: { value: new THREE.Vector2(0.5, 0.5) },
        mouseInfluence: { value: mouseInfluence },
        noiseAmount: { value: noiseAmount },
        distortion: { value: distortion },
      }),
      []
    );

    useImperativeHandle(ref, () => ({
      updateUniforms: (time, width, height) => {
        if (!meshRef.current) return;
        const material = meshRef.current.material;
        material.uniforms.iTime.value = time;
        material.uniforms.iResolution.value.set(width, height);

        const { anchor, dir } = getAnchorAndDir(raysOrigin, width, height);
        material.uniforms.rayPos.value.set(anchor[0], anchor[1]);
        material.uniforms.rayDir.value.set(dir[0], dir[1]);
      },
    }));

    useFrame((state) => {
      if (!meshRef.current) return;

      const material = meshRef.current.material;
      material.uniforms.iTime.value = state.clock.elapsedTime;
      material.uniforms.iResolution.value.set(size.width, size.height);
      material.uniforms.raysColor.value.set(raysColor);
      material.uniforms.raysSpeed.value = raysSpeed;
      material.uniforms.lightSpread.value = lightSpread;
      material.uniforms.rayLength.value = rayLength;
      material.uniforms.pulsating.value = pulsating ? 1.0 : 0.0;
      material.uniforms.fadeDistance.value = fadeDistance;
      material.uniforms.saturation.value = saturation;
      material.uniforms.mouseInfluence.value = mouseInfluence;
      material.uniforms.noiseAmount.value = noiseAmount;
      material.uniforms.distortion.value = distortion;

      if (followMouse) {
        const mx = (pointer.x + 1) / 2;
        const my = (1 - pointer.y) / 2;
        material.uniforms.mousePos.value.set(mx, my);
      }

      const { anchor, dir } = getAnchorAndDir(raysOrigin, size.width, size.height);
      material.uniforms.rayPos.value.set(anchor[0], anchor[1]);
      material.uniforms.rayDir.value.set(dir[0], dir[1]);
    });

    const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      // Render full screen quad, ignoring camera projection
      gl_Position = vec4(position, 1.0);
    }
  `;

    const fragmentShader = `
    uniform float iTime;
    uniform vec2  iResolution;
    uniform vec2  rayPos;
    uniform vec2  rayDir;
    uniform vec3  raysColor;
    uniform float raysSpeed;
    uniform float lightSpread;
    uniform float rayLength;
    uniform float pulsating;
    uniform float fadeDistance;
    uniform float saturation;
    uniform vec2  mousePos;
    uniform float mouseInfluence;
    uniform float noiseAmount;
    uniform float distortion;

    varying vec2 vUv;

    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                      float seedA, float seedB, float speed) {
      vec2 sourceToCoord = coord - raySource;
      vec2 dirNorm = normalize(sourceToCoord);
      float cosAngle = dot(dirNorm, rayRefDirection);

      float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
      
      float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

      float distance = length(sourceToCoord);
      float maxDistance = iResolution.x * rayLength;
      float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
      
      float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
      float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

      float baseStrength = clamp(
        (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
        (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
        0.0, 1.0
      );

      return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
    }

    void main() {
      vec2 fragCoord = gl_FragCoord.xy;
      vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
      
      vec2 finalRayDir = rayDir;
      if (mouseInfluence > 0.0) {
        vec2 mouseScreenPos = mousePos * iResolution.xy;
        vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
        finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
      }

      vec4 rays1 = vec4(1.0) *
                   rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                               1.5 * raysSpeed);
      vec4 rays2 = vec4(1.0) *
                   rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                               1.1 * raysSpeed);

      vec4 color = rays1 * 0.5 + rays2 * 0.4;

      if (noiseAmount > 0.0) {
        float n = noise(coord * 0.01 + iTime * 0.1);
        color.rgb *= (1.0 - noiseAmount + noiseAmount * n);
      }

      float brightness = 1.0 - (coord.y / iResolution.y);
      color.x *= 0.1 + brightness * 0.8;
      color.y *= 0.3 + brightness * 0.6;
      color.z *= 0.5 + brightness * 0.5;

      if (saturation != 1.0) {
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = mix(vec3(gray), color.rgb, saturation);
      }

      color.rgb *= raysColor;
      gl_FragColor = color;
    }
  `;

    return (
      <mesh ref={meshRef} renderOrder={-1}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    );
  }
);

export default LightRaysBackground;
