import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, RoundedBox, Sparkles } from "@react-three/drei";
import {
  Box3,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MathUtils,
  Shape,
  SphereGeometry,
  Vector3,
} from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Leaf, Loader2, LockKeyhole, User } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../store/auth";

/* ───────── Helpers ───────── */
const GREETING = {
  idle: "Hi! I'm EcoBot. Nice to meet you!",
  wave: "Hi there! I'm glad you said hello 👋",
  username: "Please enter your username.",
  peek: "Your password is visible. Be careful!",
  password: "I'll close my eyes. Your password is safe!",
  loading: "Just a moment, I'm processing your login.",
  success: "Login Success! Welcome back.",
  error: "It looks like something needs to be checked.",
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = (e) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function RobotFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      role="img"
      aria-label="EcoBot"
    >
      <div>
        <div className="relative mx-auto flex h-28 w-40 items-center justify-center rounded-[2rem] bg-[#EBDDC4] shadow-lg ring-1 ring-[#DCCBAA]">
          <span className="absolute -top-6 left-1/2 h-8 w-3 -translate-x-1/2 rotate-12 rounded-full bg-[#C2631E]" />
          <div className="flex h-20 w-32 items-center justify-center gap-7 rounded-[1.4rem] bg-[#0A2E34]">
            <span className="h-6 w-6 rounded-full border-[3px] border-[#5EF2E3] shadow-[0_0_14px_#2BD9C9]" />
            <span className="h-6 w-6 rounded-full border-[3px] border-[#5EF2E3] shadow-[0_0_14px_#2BD9C9]" />
          </div>
        </div>
        <div className="mx-auto -mt-2 h-20 w-28 rounded-[1.6rem] bg-[#EBDDC4] ring-1 ring-[#DCCBAA]" />
      </div>
    </div>
  );
}

/* ───────── 3D Robot (cream + teal, random walk) ───────── */
const rand = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/* Round "apple/egg" head: a superellipsoid (a sphere pushed slightly toward a
   squircle) — wide, soft and fully round like the reference. */
const HEAD_A = 0.95; // half width
const HEAD_B = 0.62; // half height
const HEAD_C = 0.62; // half depth
const HEAD_N = 2.4; // 2 = perfect ellipsoid, higher = squarer

function makeHeadGeometry() {
  const g = new SphereGeometry(1, 72, 56);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const pos = g.attributes.position;
  const e = 2 / HEAD_N;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setXYZ(
      i,
      Math.sign(x) * Math.pow(Math.abs(x), e) * HEAD_A,
      Math.sign(y) * Math.pow(Math.abs(y), e) * HEAD_B,
      Math.sign(z) * Math.pow(Math.abs(z), e) * HEAD_C,
    );
  }
  const merged = mergeVertices(g); // weld the seam so shading is smooth
  merged.computeVertexNormals();
  return merged;
}

// z of the head surface at (x, y) on the front side
const headSurfaceZ = (x, y) =>
  HEAD_C *
  Math.pow(
    Math.max(
      0,
      1 -
        Math.pow(Math.abs(x) / HEAD_A, HEAD_N) -
        Math.pow(Math.abs(y) / HEAD_B, HEAD_N),
    ),
    1 / HEAD_N,
  );

// A rounded-rectangle patch that hugs the curved front of the head
function makeFacePatch(w, h, offset, p = 4.5, segX = 56, segY = 40) {
  const verts = [];
  const idx = [];
  for (let j = 0; j <= segY; j++) {
    for (let i = 0; i <= segX; i++) {
      const u = -1 + (2 * i) / segX;
      const v = -1 + (2 * j) / segY;
      const m = Math.max(Math.abs(u), Math.abs(v));
      const r = Math.pow(
        Math.pow(Math.abs(u), p) + Math.pow(Math.abs(v), p),
        1 / p,
      );
      const k = r === 0 ? 0 : m / r;
      const x = u * k * (w / 2);
      const y = v * k * (h / 2);
      verts.push(x, y, headSurfaceZ(x, y) + offset);
    }
  }
  for (let j = 0; j < segY; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * (segX + 1) + i;
      const b = a + 1;
      const c = a + (segX + 1);
      const d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function Robot({ mode, reduced, onWave, eyesLocked, bubbleRef }) {
  const walkG = useRef();
  const root = useRef();
  const head = useRef();
  const torso = useRef();
  const eyes = useRef();
  const eyeL = useRef();
  const eyeR = useRef();
  const mouth = useRef();
  const leafRef = useRef();
  const core = useRef();
  const kb = useRef();
  const armL = useRef();
  const armR = useRef();
  const elL = useRef();
  const elR = useRef();
  const legL = useRef();
  const legR = useRef();
  const knL = useRef();
  const knR = useRef();
  const hovered = useRef(false);
  const blink = useRef({ at: 0, next: 2 });
  const headPos = useRef(new Vector3());
  const walk = useRef({
    x: 0,
    z: 0,
    tx: 0,
    tz: 0,
    yaw: 0,
    pause: 1,
    moving: false,
    phase: 0,
    amp: 0,
  });

  // Manual hover + click hit-testing.
  // The Canvas uses eventSource={document.body}, so R3F's own pointer events can be
  // off (stale canvas offset). Here we project the robot's bounding box to the screen
  // using the canvas' live bounding rect, so clicking/hovering the robot always works.
  const get = useThree((s) => s.get);
  const waveRef = useRef(onWave);
  waveRef.current = onWave;

  useEffect(() => {
    const box = new Box3();
    const v = new Vector3();

    const isOverRobot = (e) => {
      if (!root.current) return false;
      const { camera, gl } = get();
      const rect = gl.domElement.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )
        return false;

      box.setFromObject(root.current);
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < 8; i++) {
        v.set(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z,
        ).project(camera);
        const sx = rect.left + (v.x * 0.5 + 0.5) * rect.width;
        const sy = rect.top + (-v.y * 0.5 + 0.5) * rect.height;
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy);
        maxY = Math.max(maxY, sy);
      }
      return (
        e.clientX >= minX &&
        e.clientX <= maxX &&
        e.clientY >= minY &&
        e.clientY <= maxY
      );
    };

    const onMove = (e) => {
      const over = isOverRobot(e);
      if (over !== hovered.current) {
        hovered.current = over;
        document.body.style.cursor = over ? "pointer" : "";
      }
    };
    const onClick = (e) => {
      if (isOverRobot(e)) waveRef.current?.();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
      document.body.style.cursor = "";
    };
  }, [get]);

  const mats = useMemo(
    () => ({
      cream: {
        color: "#EBDDC4",
        roughness: 0.4,
        metalness: 0.02,
        clearcoat: 0.35,
        clearcoatRoughness: 0.4,
      },
      creamD: {
        color: "#DCCBAA",
        roughness: 0.4,
        metalness: 0.02,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
      },
      teal: { color: "#1E4F5A", roughness: 0.45, metalness: 0.1 },
      tealLight: {
        color: "#6D9EA3",
        roughness: 0.25,
        metalness: 0.2,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
      },
      screen: {
        color: "#0A2E34",
        roughness: 0.08,
        metalness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      },
      orange: { color: "#E2792B", roughness: 0.4, metalness: 0.05 },
      leaf: {
        color: "#C2631E",
        roughness: 0.5,
        metalness: 0.02,
        side: DoubleSide,
      },
      leafD: { color: "#9E4B14", roughness: 0.6, side: DoubleSide },
    }),
    [],
  );

  const glowMat = useMemo(
    () => ({
      color: "#5EF2E3",
      emissive: "#2BD9C9",
      emissiveIntensity: 1.6,
    }),
    [],
  );

  const headGeo = useMemo(() => makeHeadGeometry(), []);
  const bezelGeo = useMemo(() => makeFacePatch(1.58, 1.08, 0.01), []);
  const screenGeo = useMemo(() => makeFacePatch(1.4, 0.92, 0.03), []);

  // sprout leaf (tip leans to the right, like the reference)
  const leafShape = useMemo(() => {
    const s = new Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(-0.14, 0.1, -0.15, 0.42, 0.1, 0.7);
    s.bezierCurveTo(0.14, 0.42, 0.14, 0.12, 0, 0);
    return s;
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const d = MathUtils.damp;
    const { x: px, y: py } = state.pointer;
    const w = walk.current;
    const cover = mode === "password";
    const waving = mode === "wave";
    const typing = mode === "loading";
    const cheer = mode === "success";

    // ── random walk inside a box (bounds follow the viewport size)
    const bx = Math.max(0.4, state.viewport.width / 2 - 1.2);
    let speed = 0;
    let faceT = null;
    if (mode === "idle" && !hovered.current && !reduced) {
      if (!w.moving) {
        w.pause -= dt;
        if (w.pause <= 0) {
          w.tx = rand(-bx, bx);
          w.tz = rand(-1, 0.7);
          w.moving = true;
        }
      }
      if (w.moving) {
        const dx = w.tx - w.x;
        const dz = w.tz - w.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.08) {
          w.moving = false;
          w.pause = rand(1.5, 4);
        } else {
          speed = Math.min(0.8, 0.25 + dist * 0.8);
          w.x += (dx / dist) * speed * dt;
          w.z += (dz / dist) * speed * dt;
          faceT = (dx / dist) * 0.6; // max ±0.6 rad, never turns its back to the camera
        }
      }
    }
    w.x = MathUtils.clamp(w.x, -bx, bx);
    w.amp = d(w.amp, speed > 0 ? 1 : 0, 8, dt);
    w.phase += dt * (speed > 0 ? 4 + speed * 4 : 0);

    const still = cover || typing || cheer || waving || mode === "error";
    const target =
      faceT ??
      (still
        ? 0
        : mode === "username" || mode === "peek"
          ? 0.4
          : MathUtils.clamp(px * 0.3, -0.3, 0.3));
    w.yaw += angDiff(w.yaw, target) * (1 - Math.exp(-5 * dt));
    walkG.current.position.set(w.x, 0, w.z);
    walkG.current.rotation.y = w.yaw;

    // ── head
    let hy =
      speed > 0
        ? Math.sin(t * 0.9) * 0.12 - w.yaw * 0.6
        : MathUtils.clamp(px * 0.5, -0.5, 0.5) - w.yaw * 0.3;
    let hp = speed > 0 ? 0 : -py * 0.25;
    let hr = hovered.current ? 0.22 : 0;
    if (mode === "username" || mode === "peek") hy = 0.1;
    if (cover) {
      hy = 0;
      hp = 0.177;
    }
    if (typing) {
      hy = Math.sin(t * 2) * 0.2;
      hp = 0.22;
    }
    if (mode === "error") hy = Math.sin(t * 14) * 0.1;
    if (cheer) hp = -0.15;
    if (waving) {
      // facing straight to the front (no turn, no nod, no tilt)
      hy = 0;
      hp = 0;
      hr = 0;
    }
    const h = head.current;
    hy = MathUtils.clamp(hy, -0.6, 0.6);
    h.rotation.y = d(h.rotation.y, hy, 4, dt);
    h.rotation.x = d(h.rotation.x, hp, 4, dt);
    h.rotation.z = d(h.rotation.z, hr, 5, dt);

    // ── sprout leaf sway + chest core pulse
    leafRef.current.rotation.z =
      -0.15 +
      Math.sin(t * 1.6) * 0.06 * (reduced ? 0.3 : 1) +
      (cheer ? Math.sin(t * 10) * 0.1 : 0);
    core.current.material.emissiveIntensity =
      1.8 + Math.sin(t * 3) * 0.5 * (reduced ? 0.3 : 1) + (typing ? 0.8 : 0);

    // ── body: walking bob / success jump / breathing
    const jump = cheer ? Math.abs(Math.sin(t * 7)) * 0.25 : 0;
    root.current.position.y = jump + Math.abs(Math.sin(w.phase)) * 0.05 * w.amp;
    torso.current.scale.y = 1 + Math.sin(t * 2) * 0.015 * (reduced ? 0.25 : 1);

    // ── eyes & mouth
    // while typing the password, the eyes don't follow the cursor
    const lock = eyesLocked || cover || waving;
    eyes.current.position.x = d(
      eyes.current.position.x,
      lock ? 0 : px * 0.08,
      6,
      dt,
    );
    eyes.current.position.y = d(
      eyes.current.position.y,
      lock ? -0.1 : -0.1 - py * 0.05,
      6,
      dt,
    );
    const b = blink.current;
    if (t > b.next) {
      b.at = t;
      b.next = t + 2 + Math.random() * 3;
    }
    let ey = t - b.at < 0.12 ? 0.1 : 1;
    if (cover) ey = 0.1;
    if (cheer || waving) ey = 0.45;
    eyeL.current.scale.y = d(eyeL.current.scale.y, ey, 14, dt);
    eyeR.current.scale.y = eyeL.current.scale.y;

    // mouth is hidden by default (like the reference) and only appears for emotions
    const showMouth = cheer || waving || mode === "error";
    mouth.current.rotation.z = d(
      mouth.current.rotation.z,
      mode === "error" ? 0 : Math.PI,
      8,
      dt,
    );
    const ms = d(mouth.current.scale.x, showMouth ? 1.3 : 0.01, 8, dt);
    mouth.current.scale.setScalar(ms);
    mouth.current.visible = ms > 0.05;

    // ── legs
    const swing = Math.sin(w.phase) * 0.6 * w.amp;
    [
      [legL, knL, -1],
      [legR, knR, 1],
    ].forEach(([hip, knee, s]) => {
      hip.current.rotation.x = s < 0 ? swing : -swing;
      const c = Math.cos(w.phase);
      knee.current.rotation.x = Math.max(0, s < 0 ? -c : c) * 0.9 * w.amp;
    });

    // ── arms
    [
      [armL, elL, -1],
      [armR, elR, 1],
    ].forEach(([sh, el, s]) => {
      let rx = (s < 0 ? -swing : swing) * 0.8;
      let rz = s * 0.18 + Math.sin(t * 1.2) * 0.03 * s;
      let er = -0.25;
      let ez = 0;
      let sx = s * 0.55;
      let sy = 1.75;
      let sz = 0;
      if (cover) {
        // both hands go up to cover the eyes
        // calculated angles: elbows in front of the chin, hands in front of the eyes, no clipping through the head
        // shoulders are lifted slightly forward so the hands land right in front of the eyes
        sx = s * 0.487;
        sy = 1.789;
        sz = 0.199;
        rx = -2.091;
        rz = -s * 0.674;
        er = -0.782;
        ez = s * 0.688;
      } else if (cheer) {
        rx = 0;
        rz = s * 2.6;
        er = 0;
        ez = s * Math.sin(t * 12) * 0.2;
      } else if (waving && s > 0) {
        rx = 0;
        rz = 2.5;
        er = 0;
        ez = Math.sin(t * 10) * 0.45;
      } else if (typing) {
        rx = -0.9;
        rz = -s * 0.1;
        er = -0.7 + Math.sin(t * 14 + s) * 0.12;
      }
      sh.current.position.x = d(sh.current.position.x, sx, 9, dt);
      sh.current.position.y = d(sh.current.position.y, sy, 9, dt);
      sh.current.position.z = d(sh.current.position.z, sz, 9, dt);
      sh.current.rotation.x = d(sh.current.rotation.x, rx, 9, dt);
      sh.current.rotation.z = d(sh.current.rotation.z, rz, 9, dt);
      el.current.rotation.x = d(el.current.rotation.x, er, 9, dt);
      el.current.rotation.z = d(el.current.rotation.z, ez, 9, dt);
    });

    kb.current.material.opacity = d(
      kb.current.material.opacity,
      typing ? 0.5 : 0,
      8,
      dt,
    );

    // ── greeting bubble: project the robot's head to screen space so the
    // bubble always follows the robot and scales with the canvas (zoom/resize safe)
    const bubble = bubbleRef?.current;
    if (bubble) {
      const p = headPos.current;
      root.current.getWorldPosition(p);
      p.y += 3.4; // just above the sprout leaf (world units)
      p.project(state.camera);
      const { width, height } = state.size;
      const bw = bubble.offsetWidth;
      const half = bw / 2 + 8;
      const x = MathUtils.clamp(
        (p.x * 0.5 + 0.5) * width,
        Math.min(half, width / 2),
        Math.max(width - half, width / 2),
      );
      const y = Math.max(bubble.offsetHeight + 8, (-p.y * 0.5 + 0.5) * height);
      bubble.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
      bubble.style.opacity = "1";
    }
  });

  const m = (k) => <meshPhysicalMaterial {...mats[k]} />;
  const glow = (intensity = 1.6) => (
    <meshStandardMaterial {...glowMat} emissiveIntensity={intensity} />
  );

  const arm = (s, sh, el) => (
    <group ref={sh} position={[s * 0.55, 1.75, 0]}>
      {/* shoulder */}
      <mesh scale={[1, 1, 0.95]}>
        <sphereGeometry args={[0.19, 24, 24]} />
        {m("cream")}
      </mesh>
      <mesh position={[0, -0.28, 0]}>
        <capsuleGeometry args={[0.11, 0.28, 8, 16]} />
        {m("cream")}
      </mesh>
      {/* elbow */}
      <group ref={el} position={[0, -0.55, 0]}>
        <mesh>
          <sphereGeometry args={[0.11, 18, 18]} />
          {m("teal")}
        </mesh>
        <mesh position={[0, -0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.108, 0.022, 10, 28]} />
          {m("orange")}
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <capsuleGeometry args={[0.115, 0.28, 8, 16]} />
          {m("cream")}
        </mesh>
        {/* hand: cream palm + dark teal fingertips */}
        <group position={[0, -0.64, 0]}>
          <mesh scale={[1, 1.05, 0.9]}>
            <sphereGeometry args={[0.15, 22, 22]} />
            {m("cream")}
          </mesh>
          {[-0.07, 0, 0.07].map((fx, i) => (
            <mesh
              key={fx}
              position={[fx, i === 1 ? -0.155 : -0.135, 0.03]}
              scale={[1, 1.2, 1]}
            >
              <sphereGeometry args={[0.046, 14, 14]} />
              {m("teal")}
            </mesh>
          ))}
          <mesh position={[s * 0.14, -0.04, 0.04]} scale={[1, 1.2, 1]}>
            <sphereGeometry args={[0.045, 14, 14]} />
            {m("teal")}
          </mesh>
        </group>
      </group>
    </group>
  );

  const leg = (s, hip, knee) => (
    <group ref={hip} position={[s * 0.24, 1.0, 0]}>
      <mesh position={[0, -0.2, 0]}>
        <capsuleGeometry args={[0.15, 0.18, 8, 16]} />
        {m("cream")}
      </mesh>
      <group ref={knee} position={[0, -0.42, 0]}>
        <mesh>
          <sphereGeometry args={[0.12, 18, 18]} />
          {m("teal")}
        </mesh>
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.125, 0.02, 10, 28]} />
          {m("orange")}
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <capsuleGeometry args={[0.135, 0.12, 8, 16]} />
          {m("cream")}
        </mesh>
        {/* chunky boot */}
        <RoundedBox
          args={[0.56, 0.3, 0.7]}
          radius={0.14}
          smoothness={4}
          position={[0, -0.4, 0.08]}
        >
          {m("cream")}
        </RoundedBox>
        <RoundedBox
          args={[0.58, 0.07, 0.72]}
          radius={0.03}
          smoothness={2}
          position={[0, -0.54, 0.08]}
        >
          {m("teal")}
        </RoundedBox>
      </group>
    </group>
  );

  return (
    <group ref={walkG}>
      <group scale={0.85}>
        <group ref={root}>
          {leg(-1, legL, knL)}
          {leg(1, legR, knR)}

          {/* pelvis */}
          <RoundedBox
            args={[0.56, 0.22, 0.46]}
            radius={0.09}
            smoothness={3}
            position={[0, 1.1, 0]}
          >
            {m("teal")}
          </RoundedBox>

          {/* egg-shaped torso + glowing chest core */}
          <group ref={torso} position={[0, 1.5, 0]}>
            <mesh scale={[0.5, 0.47, 0.4]}>
              <sphereGeometry args={[1, 40, 40]} />
              {m("cream")}
            </mesh>
            <group position={[0, 0.02, 0.385]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.05, 32]} />
                {m("teal")}
              </mesh>
              <mesh position={[0, 0, 0.03]}>
                <torusGeometry args={[0.15, 0.025, 12, 40]} />
                {m("orange")}
              </mesh>
              <mesh position={[0, 0, 0.026]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.125, 0.125, 0.03, 32]} />
                {m("teal")}
              </mesh>
              <mesh ref={core} position={[0, 0, 0.05]}>
                <sphereGeometry args={[0.065, 24, 24]} />
                {glow(1.8)}
              </mesh>
            </group>
          </group>

          {/* neck */}
          <mesh position={[0, 1.97, 0]}>
            <cylinderGeometry args={[0.13, 0.15, 0.14, 20]} />
            {m("teal")}
          </mesh>

          {/* head */}
          <group ref={head} position={[0, 2.57, 0]}>
            <mesh geometry={headGeo}>{m("cream")}</mesh>

            {/* face plate bezel + dark glossy screen (both follow the round head) */}
            <mesh geometry={bezelGeo}>{m("creamD")}</mesh>
            <mesh geometry={screenGeo}>{m("screen")}</mesh>
            {/* screen reflection */}
            <mesh
              position={[0.4, 0.25, 0.6]}
              rotation={[0, 0.3, -0.3]}
              scale={[2.4, 0.5, 1]}
            >
              <circleGeometry args={[0.14, 24]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.13} />
            </mesh>

            {/* eyes (cyan rings + catch-lights) and eyebrows */}
            <group ref={eyes} position={[0, -0.1, 0.64]}>
              {[-1, 1].map((s) => (
                <group
                  key={s}
                  ref={s < 0 ? eyeL : eyeR}
                  position={[s * 0.34, 0, 0]}
                >
                  <mesh position={[0, 0, -0.004]}>
                    <circleGeometry args={[0.135, 32]} />
                    <meshBasicMaterial color="#0D3A41" />
                  </mesh>
                  <mesh>
                    <torusGeometry args={[0.135, 0.03, 12, 40]} />
                    {glow(1.6)}
                  </mesh>
                  <mesh position={[-s * 0.045, 0.05, 0.02]}>
                    <sphereGeometry args={[0.032, 16, 16]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                </group>
              ))}
              {[-1, 1].map((s) => (
                <mesh
                  key={`brow${s}`}
                  position={[s * 0.34, 0.27, 0]}
                  rotation={[
                    0,
                    0,
                    Math.PI / 2 - (Math.PI * 0.55) / 2 - s * 0.1,
                  ]}
                >
                  <torusGeometry args={[0.11, 0.012, 8, 24, Math.PI * 0.55]} />
                  {glow(1.4)}
                </mesh>
              ))}
            </group>

            {/* mouth (only visible on emotions) */}
            <mesh
              ref={mouth}
              position={[0, -0.3, 0.63]}
              rotation={[0, 0, Math.PI]}
              scale={0.01}
              visible={false}
            >
              <torusGeometry args={[0.09, 0.018, 8, 24, Math.PI]} />
              {glow(1.6)}
            </mesh>

            {/* ear pieces */}
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.9, -0.02, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.27, 0.27, 0.2, 28]} />
                  {m("cream")}
                </mesh>
                <mesh
                  position={[s * 0.105, 0, 0]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  <torusGeometry args={[0.2, 0.035, 10, 32]} />
                  {m("teal")}
                </mesh>
                <mesh
                  position={[s * 0.112, 0, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.19, 0.19, 0.04, 28]} />
                  {m("tealLight")}
                </mesh>
              </group>
            ))}

            {/* sprout leaf on top of the head */}
            <group
              ref={leafRef}
              position={[-0.1, 0.59, 0]}
              rotation={[0, 0, -0.15]}
            >
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.05, 0.05, 14]} />
                {m("teal")}
              </mesh>
              <group scale={0.7} position={[0, 0.02, -0.01]}>
                <mesh>
                  <extrudeGeometry
                    args={[
                      leafShape,
                      {
                        depth: 0.03,
                        bevelEnabled: true,
                        bevelThickness: 0.012,
                        bevelSize: 0.012,
                        bevelSegments: 3,
                        curveSegments: 24,
                      },
                    ]}
                  />
                  {m("leaf")}
                </mesh>
                <mesh position={[0.05, 0.35, 0.046]} rotation={[0, 0, -0.14]}>
                  <capsuleGeometry args={[0.006, 0.4, 4, 8]} />
                  {m("leafD")}
                </mesh>
              </group>
            </group>
          </group>

          {arm(-1, armL, elL)}
          {arm(1, armR, elR)}

          {/* keyboard hologram while loading */}
          <mesh ref={kb} position={[0, 1.38, 0.9]}>
            <boxGeometry args={[1, 0.04, 0.45]} />
            <meshBasicMaterial color="#67E8F9" transparent opacity={0} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function Scene({ mode, reduced, onWave, eyesLocked, bubbleRef }) {
  return (
    <Canvas
      camera={{ position: [0, 2.0, 8.6], fov: 32 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.35, 0)}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      eventSource={document.body}
      eventPrefix="client"
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#ffffff", "#D1FAE5", 0.6]} />
      <directionalLight position={[3, 5, 4]} intensity={1.9} />
      <pointLight position={[-3, 2, 3]} intensity={10} color="#67E8F9" />
      <Suspense fallback={null}>
        <Robot
          mode={mode}
          reduced={reduced}
          onWave={onWave}
          eyesLocked={eyesLocked}
          bubbleRef={bubbleRef}
        />
        {!reduced && (
          <Sparkles
            count={26}
            scale={[7, 4, 3]}
            position={[0, 1.6, 0]}
            size={3}
            speed={0.3}
            color="#10B981"
            opacity={0.7}
          />
        )}
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.3}
          scale={12}
          blur={2.4}
          far={4}
          resolution={256}
          color="#064E3B"
        />
      </Suspense>
    </Canvas>
  );
}

/* ───────── Floating draggable label ───────── */
function Floating({
  children,
  className = "",
  constraintsRef,
  delay = 0,
  reduced,
}) {
  return (
    <motion.div
      drag
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0.12}
      whileDrag={{ scale: 1.05 }}
      className={`absolute z-20 cursor-grab touch-none select-none active:cursor-grabbing ${className}`}
    >
      <motion.div
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const chip =
  "rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-medium text-slate-700 shadow-[0_6px_20px_-8px_rgba(15,23,42,0.18)] backdrop-blur";

function Visual({ mode, reduced, onWave, pageRef, eyesLocked }) {
  const [webgl] = useState(hasWebGL);
  const bubbleRef = useRef(null);
  return (
    <div className="relative min-h-[360px] rounded-3xl bg-gradient-to-b from-[#ECFDF5] to-[#D1FAE5] md:min-h-[560px]">
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        {webgl ? (
          <SceneBoundary fallback={<RobotFallback />}>
            <Scene
              mode={mode}
              reduced={reduced}
              onWave={onWave}
              eyesLocked={eyesLocked}
              bubbleRef={bubbleRef}
            />
          </SceneBoundary>
        ) : (
          <RobotFallback />
        )}

        {/* greeting bubble overlay: same box as the canvas, positioned from the robot's head each frame */}
        {webgl && (
          <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
            <div
              ref={bubbleRef}
              className="absolute left-0 top-0 w-max max-w-[min(190px,80%)] opacity-0 will-change-transform"
              aria-live="polite"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, scale: 0.9, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{ transformOrigin: "bottom center" }}
                  className="relative rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-center text-[13px] font-medium leading-snug text-slate-800 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.3)]"
                >
                  {GREETING[mode]}
                  <span className="absolute -bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 text-white shadow-md">
          <Leaf className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-900">EcoBot AI</p>
          <p className="text-[11px] text-slate-500">IK Engineering</p>
        </div>
      </div>

      <Floating
        className="right-5 top-6"
        constraintsRef={pageRef}
        reduced={reduced}
      >
        <div className={chip}>
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Ready to assist
        </div>
      </Floating>
      <Floating
        className="left-5 top-1/2"
        constraintsRef={pageRef}
        delay={1.2}
        reduced={reduced}
      >
        {/* <div className={chip}>Ready to assist</div> */}
      </Floating>
    </div>
  );
}

/* ───────── Form ───────── */
function LoginForm({
  status,
  serverError,
  onSubmit,
  setFocusField,
  setStatus,
  showPass,
  setShowPass,
  form,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;
  const busy = status === "loading" || status === "success";
  const clearError = () => setStatus((s) => (s === "error" ? "idle" : s));

  const inputBase =
    "w-full rounded-xl border bg-white py-3 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60";

  return (
    <div className="flex flex-col justify-center px-2 py-6 md:px-10">
      <h1 className="text-3xl font-bold text-slate-900">Welcome Back!</h1>
      <p className="mt-2 text-sm text-slate-500">
        Sign in to start interacting with EcoBot.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-8 space-y-5"
      >
        <div>
          <label
            htmlFor="username"
            className="mb-1.5 block text-sm font-semibold text-slate-800"
          >
            Username
          </label>
          <div className="relative">
            <User
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Enter your username"
              disabled={busy}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-err" : undefined}
              className={`${inputBase} ${errors.username ? "border-red-300" : "border-slate-200"}`}
              {...register("username", {
                required: "Username is required.",
                onChange: clearError,
                onBlur: () => setFocusField(null),
              })}
              onFocus={() => setFocusField("username")}
            />
          </div>
          {errors.username && (
            <p
              id="username-err"
              role="alert"
              className="mt-1.5 text-xs font-medium text-red-600"
            >
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-semibold text-slate-800"
          >
            Password
          </label>
          <div className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              id="password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={busy}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-err" : undefined}
              className={`${inputBase} ${errors.password ? "border-red-300" : "border-slate-200"}`}
              {...register("password", {
                required: "Password is required.",
                onChange: clearError,
                onBlur: () => setFocusField(null),
              })}
              onFocus={() => setFocusField("password")}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 outline-none transition hover:text-slate-800 focus-visible:ring-4 focus-visible:ring-emerald-100"
            >
              {showPass ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p
              id="password-err"
              role="alert"
              className="mt-1.5 text-xs font-medium text-red-600"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        {serverError && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:from-emerald-700 hover:to-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {status === "loading"
            ? "Waiting..."
            : status === "success"
              ? "Login Success"
              : "Login"}
        </button>
      </form>
    </div>
  );
}

/* ───────── Page ───────── */
export default function EcoBotLogin() {
  const { setLoginResponse } = useAuth();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const pageRef = useRef(null);
  const form = useForm({
    defaultValues: { username: "", password: "" },
    mode: "onTouched",
  });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [serverError, setServerError] = useState("");
  const [focusField, setFocusField] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [waving, setWaving] = useState(false);
  const timer = useRef();
  const waveTimer = useRef();

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(waveTimer.current);
    },
    [],
  );

  const handleWave = () => {
    setWaving(true);
    clearTimeout(waveTimer.current);
    waveTimer.current = setTimeout(() => setWaving(false), 2600);
  };

  const mode =
    status !== "idle"
      ? status
      : focusField === "password"
        ? showPass
          ? "peek"
          : "password"
        : waving
          ? "wave"
          : focusField
            ? "username"
            : "idle";

  const onSubmit = async (data) => {
    if (status === "loading" || status === "success") return;
    setStatus("loading");
    setServerError("");
    try {
      const response = await axios.post(
        `http://172.16.111.234:5009/api/v1/login`,
        {
          username: data.username,
          password: data.password,
          system: "ecoBot",
        },
      );
      if (response.data !== undefined && response.status === 200) {
        const userData = await response.data;
        setLoginResponse(userData.data);
        setStatus("success");
        toast.success(`Welcome! 🎉`);
        // short delay so the robot's success animation is visible
        timer.current = setTimeout(() => navigate("/"), 900);
      } else {
        throw new Error("Invalid server response.");
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please try again.";
      setServerError(message);
      setStatus("error");
      toast.error(message);
    }
  };

  return (
    <main
      ref={pageRef}
      className="fixed inset-0 overflow-y-hidden overflow-x-hidden bg-[#F4F7FB]"
    >
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-emerald-100/60 blur-3xl" />

      <div className="relative flex min-h-full w-full items-center justify-center p-4 md:p-8">
        <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-[0_24px_70px_-28px_rgba(16,185,129,0.35)] md:grid-cols-2 md:gap-8 md:rounded-[32px] md:p-6">
          <Visual
            mode={mode}
            reduced={reduced}
            onWave={handleWave}
            pageRef={pageRef}
            eyesLocked={focusField === "password"}
          />
          <LoginForm
            status={status}
            serverError={serverError}
            onSubmit={onSubmit}
            setFocusField={setFocusField}
            setStatus={setStatus}
            showPass={showPass}
            setShowPass={setShowPass}
            form={form}
          />
        </div>
      </div>
    </main>
  );
}
