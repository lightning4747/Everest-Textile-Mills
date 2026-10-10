import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { cn } from '../../lib/utils';

export interface LuminousFilamentsProps {
  colors?: [string, string];
  backgroundColor?: string;
  mode?: 'auto' | 'glow' | 'ink';
  fibers?: number;
  lineWidth?: number;
  sheath?: number;
  defocus?: number;
  length?: number;
  spread?: number;
  neck?: number;
  flare?: number;
  originX?: number;
  originY?: number;
  angle?: number;
  twist?: number;
  depth?: number;
  spin?: number;
  sway?: number;
  breathe?: number;
  flowSpeed?: number;
  pulses?: number;
  pulseRate?: number;
  stagger?: number;
  colorFlow?: number;
  reach?: number;
  glow?: number;
  intensity?: number;
  speed?: number;
  interactive?: boolean;
  hoverPulses?: boolean;
  clickSurge?: boolean;
  pulseStrength?: number;
  hoverBoost?: number;
  paused?: boolean;
  quality?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface LuminousFilamentsRef {
  surge: () => void;
}

const wShader = `#version 300 es
in vec4 aFiber;
in vec2 aSample;
uniform sampler2D uLight;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uTime;
uniform float uSpinPhase;
uniform float uHead;
uniform vec2 uOrigin;
uniform float uAngle;
uniform float uLength;
uniform float uSpread;
uniform float uNeck;
uniform float uFlare;
uniform float uTwist;
uniform float uSway;
uniform float uBreathe;
uniform float uLineWidth;
uniform float uSheath;
uniform float uDefocus;
uniform float uBack;
uniform float uReach;
uniform float uEnergy;
uniform float uInk;
uniform vec3 uLabA;
uniform vec3 uLabB;
out float vDist;
out float vCore;
out float vHalo;
out vec3 vColor;
out float vGain;

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return max(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0);
}

vec3 fiber(float s, vec4 f) {
  float breath = 1.0 + uBreathe * 0.14 * sin(uTime * 0.31 + 1.1) + uBreathe * 0.05 * sin(uTime * 0.73 + f.z * 6.2831853);
  float open = mix(uNeck, uSpread * breath, pow(s, uFlare)) * f.y;
  float azimuth = f.x + uSpinPhase + uTwist * s + 0.05 * s * sin(uTime * 0.21 + f.z * 6.2831853);
  float x = cos(azimuth) * open;
  float z = sin(azimuth) * open;
  x += uSway * (0.07 * pow(s, 1.7) * sin(uTime * 0.33 + 0.6) + 0.02 * sin(3.1415927 * s) * s * sin(uTime * 0.71 + 2.3));
  return vec3(x, -uLength * s, z / max(open, 1e-4));
}

vec2 toScreen(vec2 p) {
  float c = cos(uAngle);
  float s = sin(uAngle);
  return uOrigin + vec2(c * p.x - s * p.y, s * p.x + c * p.y) * uResolution.y;
}

vec4 lightAt(float s, float row) {
  float k = min(uHead - s * 160.0, floor(uHead));
  float k0 = floor(k);
  float f = k - k0;
  int y = int(row + 0.5);
  vec4 a = texelFetch(uLight, ivec2(int(mod(k0, 168.0)), y), 0);
  vec4 b = texelFetch(uLight, ivec2(int(mod(k0 + 1.0, 168.0)), y), 0);
  return mix(a, b, f);
}

void main() {
  float s = aSample.x;
  float delta = 1.0 / 180.0;
  vec3 p0 = fiber(max(s - delta, 0.0), aFiber);
  vec3 p1 = fiber(s, aFiber);
  vec3 p2 = fiber(min(s + delta, 1.0), aFiber);
  vec2 s0 = toScreen(p0.xy);
  vec2 s1 = toScreen(p1.xy);
  vec2 s2 = toScreen(p2.xy);
  vec2 tangent = normalize(s2 - s0 + vec2(0.0, 1e-5));
  vec2 normal = vec2(-tangent.y, tangent.x);
  float facing = clamp(0.5 + 0.5 * p1.z, 0.0, 1.0);
  float blur = 1.0 + uDefocus * 3.0 * (1.0 - facing) * (1.0 - facing);
  float core = uLineWidth * uPixelRatio * mix(0.45, 1.0, facing) * 0.5 * blur;
  float halo = uSheath * 5.0 * uPixelRatio * mix(0.6, 1.0, facing) * sqrt(blur);
  float reach = max(core * 2.4, halo * 2.2) + 1.5;
  vec2 position2 = s1 + normal * aSample.y * reach;
  vDist = aSample.y * reach;
  vCore = core;
  vHalo = halo;

  vec4 light = lightAt(s, aFiber.w);
  float amount = max(light.x, 0.0);
  float hue = clamp(light.y / max(amount, 1e-3), 0.0, 1.0);
  float heat = clamp(light.z / max(amount, 1e-3), 0.0, 1.0);
  float fade = 1.0 - smoothstep(uReach * 0.5, uReach, s);

  float tone = clamp(hue * 0.8 + s * 0.3, 0.0, 1.0);
  vec3 base = labToLinear(mix(uLabA, uLabB, smoothstep(0.0, 1.0, tone)));
  vec3 glowTint = mix(base, vec3(1.0, 0.95, 1.0), heat * 0.55);
  vec3 inkTint = mix(base, labToLinear(vec3(uLabA.x * 0.6, uLabA.yz * 1.15)), heat * 0.6);
  vColor = mix(glowTint, inkTint, uInk);
  float strand = mix(0.65, 1.0, fract(aFiber.z * 7.13 + 0.31));
  vGain = (0.1 + amount) * fade * strand * mix(uBack, 1.0, facing) * (1.0 + uEnergy * 0.15) / blur;
  gl_Position = vec4(position2 / uResolution * 2.0 - 1.0, 0.0, 1.0);
}
`;

const yShader = `#version 300 es
precision highp float;
uniform float uCore;
uniform float uSheathGain;
in float vDist;
in float vCore;
in float vHalo;
in vec3 vColor;
in float vGain;
out vec4 fragColor;

void main() {
  float sigma = max(vCore, 0.55);
  float d = vDist / sigma;
  float core = exp(-d * d) * min(vCore / 0.55, 1.0);
  float h = vDist / max(vHalo, 0.5);
  float sheath = exp(-h * h) * uSheathGain;
  float energy = (core + sheath) * vGain * uCore;
  fragColor = vec4(vColor * energy, energy);
}
`;

const sShader = `#version 300 es
in vec3 position;
in vec2 uv;
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const kShader = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = (a + b + c + d) * 0.125 + texture(uSource, vUv) * 0.5;
}
`;

const cShader = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 4.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, -1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, 1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = texture(uBase, vUv) + sum / 16.0;
}
`;

const fShader = `#version 300 es
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uGlow;
uniform float uExposure;
uniform float uMode;
uniform float uGrain;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 lines = texture(uLines, vUv);
  vec4 bloom = texture(uBloom, vUv);
  vec3 color;
  if (uMode < 0.5) {
    vec3 light = (lines.rgb + bloom.rgb * uGlow) * uExposure;
    vec3 exposed = 1.0 - exp(-light);
    float peak = max(exposed.r, max(exposed.g, exposed.b));
    exposed = mix(exposed, vec3(peak), smoothstep(0.75, 1.0, peak) * 0.35);
    color = uBackground + (1.0 - uBackground) * exposed;
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.2;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.2) / max(energy, 1e-4);
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.94);
    color = mix(uBackground, clamp(hue * 0.8, 0.0, 1.0), cover);
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), 1.0);
}
`;

function clampVal(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function parseHexOrRgb(c: string, fallback: [number, number, number]): [number, number, number] {
  if (!c) return fallback;
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    if (hex.length === 6) {
      const num = parseInt(hex, 16);
      return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
    }
  }
  return fallback;
}

function srgbToLinear(x: number): number {
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function rgbToOkLab(rgb: [number, number, number]): [number, number, number] {
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export const LuminousFilaments = forwardRef<LuminousFilamentsRef, LuminousFilamentsProps>(
  function LuminousFilaments(
    {
      colors = ['#7B4DFF', '#FF7AD9'],
      backgroundColor = '#0A0A0A',
      mode = 'auto',
      fibers = 72,
      lineWidth = 1.5,
      sheath = 0.7,
      defocus = 0.8,
      length = 1.05,
      spread = 1,
      neck = 0.035,
      flare = 1.3,
      originX = 0.5,
      originY = 0,
      angle = 0,
      twist = 0.35,
      depth = 0.6,
      spin = 0,
      sway = 1,
      breathe = 0.5,
      flowSpeed = 0.3,
      pulses = 1.3,
      pulseRate = 0.4,
      stagger = 0.4,
      colorFlow = 0.08,
      reach = 0.85,
      glow = 0.5,
      intensity = 1,
      speed = 1,
      interactive = true,
      hoverPulses = true,
      clickSurge = true,
      pulseStrength = 1,
      hoverBoost = 1,
      paused = false,
      quality = 1,
      className,
      style,
      children,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);

    const propsRef = useRef({
      colors,
      backgroundColor,
      mode,
      fibers,
      lineWidth,
      sheath,
      defocus,
      length,
      spread,
      neck,
      flare,
      originX,
      originY,
      angle,
      twist,
      depth,
      spin,
      sway,
      breathe,
      flowSpeed,
      pulses,
      pulseRate,
      stagger,
      colorFlow,
      reach,
      glow,
      intensity,
      speed,
      interactive,
      hoverPulses,
      clickSurge,
      pulseStrength,
      hoverBoost,
      paused,
      quality,
    });

    useEffect(() => {
      propsRef.current = {
        colors,
        backgroundColor,
        mode,
        fibers,
        lineWidth,
        sheath,
        defocus,
        length,
        spread,
        neck,
        flare,
        originX,
        originY,
        angle,
        twist,
        depth,
        spin,
        sway,
        breathe,
        flowSpeed,
        pulses,
        pulseRate,
        stagger,
        colorFlow,
        reach,
        glow,
        intensity,
        speed,
        interactive,
        hoverPulses,
        clickSurge,
        pulseStrength,
        hoverBoost,
        paused,
        quality,
      };
      apiRef.current?.sync();
    });

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.position = 'absolute';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      canvas.style.pointerEvents = 'none';
      container.prepend(canvas);

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: false,
          antialias: false,
          powerPreference: 'high-performance',
        });
      } catch {
        canvas.remove();
        return;
      }

      if (!renderer.capabilities.isWebGL2) {
        renderer.dispose();
        canvas.remove();
        return;
      }

      renderer.autoClear = false;

      const floatType = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float')
        ? THREE.FloatType
        : THREE.HalfFloatType;

      const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const quadGeom = new THREE.PlaneGeometry(2, 2);

      const lineMaterial = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        uniforms: {
          uLight: { value: null },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uPixelRatio: { value: 1 },
          uTime: { value: 0 },
          uSpinPhase: { value: 0 },
          uHead: { value: 0 },
          uOrigin: { value: new THREE.Vector2() },
          uAngle: { value: 0 },
          uLength: { value: 1 },
          uSpread: { value: 1 },
          uNeck: { value: 0.03 },
          uFlare: { value: 1.3 },
          uTwist: { value: 0.35 },
          uSway: { value: 1 },
          uBreathe: { value: 0.5 },
          uLineWidth: { value: 1.5 },
          uSheath: { value: 0.7 },
          uDefocus: { value: 0.8 },
          uBack: { value: 0.4 },
          uReach: { value: 0.85 },
          uEnergy: { value: 0 },
          uInk: { value: 0 },
          uLabA: { value: new THREE.Vector3() },
          uLabB: { value: new THREE.Vector3() },
          uCore: { value: 0.8 },
          uSheathGain: { value: 0.1 },
        },
        vertexShader: wShader,
        fragmentShader: yShader,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneFactor,
      });

      const createBloomMat = (frag: string, uniforms: Record<string, any>) =>
        new THREE.RawShaderMaterial({
          glslVersion: THREE.GLSL3,
          uniforms,
          vertexShader: sShader,
          fragmentShader: frag,
          depthTest: false,
          depthWrite: false,
          blending: THREE.NoBlending,
        });

      const downMat = createBloomMat(kShader, {
        uSource: { value: null },
        uTexel: { value: new THREE.Vector2() },
      });

      const upMat = createBloomMat(cShader, {
        uSource: { value: null },
        uBase: { value: null },
        uTexel: { value: new THREE.Vector2() },
      });

      const compMat = createBloomMat(fShader, {
        uLines: { value: null },
        uBloom: { value: null },
        uBackground: { value: new THREE.Vector3() },
        uGlow: { value: 0.5 },
        uExposure: { value: 1.5 },
        uMode: { value: 0 },
        uGrain: { value: 0 },
      });

      let bundleData: any = null;

      const lineMesh = new THREE.Mesh(new THREE.BufferGeometry(), lineMaterial);
      lineMesh.frustumCulled = false;
      const lineScene = new THREE.Scene();
      lineScene.add(lineMesh);

      const compMesh = new THREE.Mesh(quadGeom, compMat);
      compMesh.frustumCulled = false;
      const compScene = new THREE.Scene();
      compScene.add(compMesh);

      const createRT = (w: number, h: number) =>
        new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
          type: floatType,
          format: THREE.RGBAFormat,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          depthBuffer: false,
          stencilBuffer: false,
          generateMipmaps: false,
        });

      let mainRT: THREE.WebGLRenderTarget | null = null;
      let downRTs: THREE.WebGLRenderTarget[] = [];
      let upRTs: THREE.WebGLRenderTarget[] = [];

      let isDisposed = false;
      let animId = 0;
      let lastTime = 0;
      let isVisible = true;
      let timeVal = 20;
      let spinVal = 0;
      let headVal = 0;
      let energyVal = 0;
      let viewWidth = 1;
      let viewHeight = 1;
      let pixelRatio = 1;
      let hoverSurges: Array<{ time: number; amount: number }> = [];

      const cleanupRTs = () => {
        mainRT?.dispose();
        downRTs.forEach(rt => rt.dispose());
        upRTs.forEach(rt => rt.dispose());
        mainRT = null;
        downRTs = [];
        upRTs = [];
      };

      const renderQuad = (mat: THREE.RawShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
        compMesh.material = mat;
        renderer.setRenderTarget(target);
        renderer.render(compScene, orthoCamera);
      };

      const getParams = () => {
        const p = propsRef.current;
        return {
          angle: (clampVal(p.angle, -180, 180) * Math.PI) / 180,
          length: clampVal(p.length, 0.1, 3),
          spread: clampVal(p.spread, 0, 2),
          neck: clampVal(p.neck, 0, 0.5),
          flare: clampVal(p.flare, 0.4, 4),
          twist: clampVal(p.twist, -8, 8),
          sway: clampVal(p.sway, 0, 4),
          breathe: clampVal(p.breathe, 0, 3),
          originX: clampVal(p.originX, -1, 2) * viewWidth,
          originY: (1 - clampVal(p.originY, -1, 2)) * viewHeight,
        };
      };

      const getFlowSpeed = () => {
        const p = propsRef.current;
        return clampVal(p.flowSpeed, 0, 3) * clampVal(p.speed, 0, 4) * (1 + 0.3 * energyVal);
      };

      const computePulse = (t: number, fiberIdx: number): [number, number] => {
        const p = propsRef.current;
        const b = bundleData;
        if (!b) return [0, 0];
        const staggerVal = clampVal(p.stagger, 0, 2) * (0.3 * Math.sin(b.azimuth[fiberIdx] + 0.4) + 0.7 * (b.seed[fiberIdx] - 0.5));
        const ph = t * clampVal(p.pulseRate, 0, 4) + staggerVal;
        const wave = 0.5 + 0.5 * Math.cos(Math.PI * 2 * ph);
        const rand = 0.78 + 0.22 * Math.sin(0.37 * t + 5 * b.seed[fiberIdx]);
        let basePulse = 0.3 + 1.1 * clampVal(p.pulses, 0, 2) * wave * wave * wave * rand;

        for (const surge of hoverSurges) {
          const dt = t - surge.time - 0.45 * b.seed[fiberIdx];
          if (dt <= 0 || dt > 2.5) continue;
          const k = Math.min(dt / 0.22, 1);
          basePulse += surge.amount * k * k * (3 - 2 * k) * Math.exp(-Math.max(dt - 0.22, 0) / 0.35);
        }
        return [basePulse, 0.5 + 0.5 * Math.sin(Math.PI * 2 * t * clampVal(p.colorFlow, -2, 2) + b.azimuth[fiberIdx] + 0.6 * b.seed[fiberIdx])];
      };

      const updateLightTexture = () => {
        const b = bundleData;
        if (!b) return;
        const speedVal = 160 * Math.max(getFlowSpeed(), 0.05);
        const headInt = Math.floor(headVal);

        for (let row = 0; row < 168; row++) {
          const r = ((headInt - row) % 168 + 168) % 168;
          const tVal = timeVal - row / speedVal;
          for (let fIdx = 0; fIdx < b.count; fIdx++) {
            const [pVal, cVal] = computePulse(tVal, fIdx);
            const idx = (168 * fIdx + r) * 4;
            b.ring[idx] = pVal;
            b.ring[idx + 1] = pVal * cVal;
            b.ring[idx + 2] = 0;
            b.ring[idx + 3] = 0;
          }
        }
        b.texture.needsUpdate = true;
      };

      const rebuildFibers = () => {
        const targetCount = Math.round(clampVal(propsRef.current.fibers, 8, 320));
        if (bundleData && bundleData.count === targetCount) return;

        if (bundleData) {
          bundleData.geometry.dispose();
          bundleData.texture.dispose();
        }

        const count = targetCount;
        const vertexData = new Float32Array(181 * count * 12);
        const indexData = new Uint32Array(180 * count * 6);
        const azimuth = new Float32Array(count);
        const radius = new Float32Array(count);
        const seed = new Float32Array(count);

        let vIdx = 0;
        let iIdx = 0;
        let randSeed = 7;
        const rand = () => (randSeed = (16807 * randSeed) % 0x7fffffff) / 0x7fffffff;

        for (let i = 0; i < count; i++) {
          azimuth[i] = 2.399963 * i + (rand() - 0.5) * 0.25;
          radius[i] = Math.pow(0.03 + ((0.618034 * i + 0.31) % 1) * 0.97, 0.4);
          seed[i] = rand();

          const baseV = vIdx / 6;
          for (let step = 0; step <= 180; step++) {
            const s = step / 180;
            vertexData.set([azimuth[i], radius[i], seed[i], i, s, -1, azimuth[i], radius[i], seed[i], i, s, 1], vIdx);
            vIdx += 12;
          }

          for (let seg = 0; seg < 180; seg++) {
            const n = baseV + 2 * seg;
            indexData.set([n, n + 1, n + 2, n + 1, n + 3, n + 2], iIdx);
            iIdx += 6;
          }
        }

        const geom = new THREE.BufferGeometry();
        const buf = new THREE.InterleavedBuffer(vertexData, 6);
        geom.setAttribute('aFiber', new THREE.InterleavedBufferAttribute(buf, 4, 0));
        geom.setAttribute('aSample', new THREE.InterleavedBufferAttribute(buf, 2, 4));
        geom.setAttribute('position', new THREE.InterleavedBufferAttribute(buf, 3, 0));
        geom.setIndex(new THREE.BufferAttribute(indexData, 1));

        const ring = new Float32Array(168 * count * 4);
        const tex = new THREE.DataTexture(ring, 168, count, THREE.RGBAFormat, THREE.FloatType);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;

        bundleData = {
          count,
          azimuth,
          radius,
          seed,
          gap: new Float32Array(count),
          tracked: new Uint8Array(count),
          ring,
          texture: tex,
          geometry: geom,
        };

        lineMesh.geometry = geom;
        lineMaterial.uniforms.uLight.value = tex;
        updateLightTexture();
      };

      const triggerSurge = () => {
        const p = propsRef.current;
        if (!p.paused) {
          hoverSurges.push({ time: timeVal, amount: 1.5 * clampVal(p.pulseStrength, 0, 3) });
          while (hoverSurges.length > 12) hoverSurges.shift();
        }
      };

      const renderFrame = () => {
        if (!mainRT || !downRTs.length) return;
        rebuildFibers();

        const p = propsRef.current;
        const uniforms = lineMaterial.uniforms;
        const w = viewWidth * pixelRatio;
        const h = viewHeight * pixelRatio;
        const params = getParams();

        const bgRgb = parseHexOrRgb(p.backgroundColor, [0.04, 0.04, 0.04]);
        const lum = 0.2126 * bgRgb[0] + 0.7152 * bgRgb[1] + 0.0722 * bgRgb[2];
        const isInk = p.mode === 'ink' || (p.mode === 'auto' && lum > 0.5);

        const colA = rgbToOkLab(parseHexOrRgb(p.colors[0], [0.48, 0.3, 1]));
        const colB = rgbToOkLab(parseHexOrRgb(p.colors[1], [1, 0.48, 0.85]));

        uniforms.uResolution.value.set(w, h);
        uniforms.uPixelRatio.value = pixelRatio;
        uniforms.uTime.value = timeVal;
        uniforms.uSpinPhase.value = spinVal;
        uniforms.uHead.value = ((headVal % 168) + 168) % 168;
        uniforms.uOrigin.value.set(params.originX * pixelRatio, params.originY * pixelRatio);
        uniforms.uAngle.value = params.angle;
        uniforms.uLength.value = params.length;
        uniforms.uSpread.value = params.spread;
        uniforms.uNeck.value = params.neck;
        uniforms.uFlare.value = params.flare;
        uniforms.uTwist.value = params.twist;
        uniforms.uSway.value = params.sway;
        uniforms.uBreathe.value = params.breathe;
        uniforms.uLineWidth.value = clampVal(p.lineWidth, 0.4, 6);
        uniforms.uSheath.value = clampVal(p.sheath, 0, 3);
        uniforms.uDefocus.value = clampVal(p.defocus, 0, 2);
        uniforms.uBack.value = 1 - clampVal(p.depth, 0, 1);
        uniforms.uReach.value = clampVal(p.reach, 0.1, 1.5);
        uniforms.uEnergy.value = energyVal;
        uniforms.uInk.value = isInk ? 1 : 0;
        uniforms.uLabA.value.set(colA[0], colA[1], colA[2]);
        uniforms.uLabB.value.set(colB[0], colB[1], colB[2]);

        compMat.uniforms.uBackground.value.set(bgRgb[0], bgRgb[1], bgRgb[2]);
        compMat.uniforms.uGlow.value = clampVal(p.glow, 0, 2);
        compMat.uniforms.uExposure.value = clampVal(p.intensity, 0.1, 4);
        compMat.uniforms.uMode.value = isInk ? 1 : 0;

        renderer.setRenderTarget(mainRT);
        renderer.clear();
        renderer.render(lineScene, orthoCamera);

        let currSource = mainRT;
        for (let i = 0; i < downRTs.length; i++) {
          downMat.uniforms.uSource.value = currSource.texture;
          downMat.uniforms.uTexel.value.set(1 / currSource.width, 1 / currSource.height);
          renderQuad(downMat, downRTs[i]);
          currSource = downRTs[i];
        }

        for (let i = downRTs.length - 2; i >= 0; i--) {
          upMat.uniforms.uSource.value = currSource.texture;
          upMat.uniforms.uBase.value = downRTs[i].texture;
          upMat.uniforms.uTexel.value.set(1 / currSource.width, 1 / currSource.height);
          renderQuad(upMat, upRTs[i]);
          currSource = upRTs[i];
        }

        compMat.uniforms.uLines.value = mainRT.texture;
        compMat.uniforms.uBloom.value = currSource.texture;
        renderQuad(compMat, null);
      };

      const updateState = (now: number) => {
        if (animId === 0) return;
        const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
        lastTime = now;

        const p = propsRef.current;
        updateLightTexture();

        if (!p.paused) {
          const sp = clampVal(p.speed, 0, 4);
          timeVal += dt * sp;
          spinVal += dt * sp * clampVal(p.spin, -4, 4);
          headVal += 160 * getFlowSpeed() * dt;

          while (hoverSurges.length && timeVal - hoverSurges[0].time > 3) {
            hoverSurges.shift();
          }
        }
        renderFrame();
      };

      const loop = (now: number) => {
        if (isDisposed) return;
        updateState(now);
        if (isVisible) {
          animId = requestAnimationFrame(loop);
        } else {
          animId = 0;
        }
      };

      const startLoop = () => {
        if (!animId && isVisible && !isDisposed) {
          lastTime = performance.now();
          animId = requestAnimationFrame(loop);
        }
      };

      const handleResize = () => {
        const rect = container.getBoundingClientRect();
        viewWidth = Math.max(1, rect.width);
        viewHeight = Math.max(1, rect.height);
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2) * clampVal(propsRef.current.quality, 0.25, 1);

        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(viewWidth, viewHeight, false);

        const w = Math.round(viewWidth * pixelRatio);
        const h = Math.round(viewHeight * pixelRatio);
        cleanupRTs();

        mainRT = createRT(w, h);
        const passes = clampVal(Math.floor(Math.log2(Math.min(w, h) / 8)), 3, 7);

        for (let i = 1; i <= passes; i++) {
          downRTs.push(createRT(Math.max(1, w >> i), Math.max(1, h >> i)));
          upRTs.push(createRT(Math.max(1, w >> i), Math.max(1, h >> i)));
        }

        renderFrame();
        startLoop();
      };

      const handlePointerDown = (e: PointerEvent) => {
        if (e.button === 0 && propsRef.current.interactive && propsRef.current.clickSurge) {
          triggerSurge();
        }
      };

      container.addEventListener('pointerdown', handlePointerDown);

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      const intersectionObserver = new IntersectionObserver(entries => {
        isVisible = entries.some(entry => entry.isIntersecting);
        if (isVisible) startLoop();
      }, { rootMargin: '80px' });
      intersectionObserver.observe(container);

      handleResize();

      apiRef.current = {
        sync: () => {
          renderFrame();
          startLoop();
        },
        destroy: () => {
          isDisposed = true;
          if (animId) cancelAnimationFrame(animId);
          container.removeEventListener('pointerdown', handlePointerDown);
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          cleanupRTs();
          bundleData?.geometry.dispose();
          bundleData?.texture.dispose();
          quadGeom.dispose();
          [lineMaterial, downMat, upMat, compMat].forEach(m => m.dispose());
          renderer.dispose();
          renderer.forceContextLoss();
          canvas.remove();
        },
        surge: triggerSurge,
      };

      return () => {
        apiRef.current?.destroy();
        apiRef.current = null;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      surge: () => apiRef.current?.surge(),
    }), []);

    return (
      <div
        ref={containerRef}
        className={cn('relative isolate h-full min-h-[240px] w-full overflow-hidden', className)}
        style={{ backgroundColor, ...style }}
      >
        {children && <div className="relative z-10 h-full w-full">{children}</div>}
      </div>
    );
  }
);

LuminousFilaments.displayName = 'LuminousFilaments';
export default LuminousFilaments;
