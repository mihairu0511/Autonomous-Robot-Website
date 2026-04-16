import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, Text, Float, Html, useGLTF } from "@react-three/drei";
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import DeliveryRobot from "./components/DeliveryRobot";
import Building from "./components/building";
import DialogBox from "./components/DialogBox";

function useKeyboard() {
  const [keys, setKeys] = useState({});

  useEffect(() => {
    const down = (e) =>
      setKeys((prev) => ({ ...prev, [e.key.toLowerCase()]: true }));
    const up = (e) =>
      setKeys((prev) => ({ ...prev, [e.key.toLowerCase()]: false }));

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return keys;
}

const checkpointSequence = [
  {
    id: "supermarket",
    step: 1,
    title: "Stinger Supermarket",
    subtitle: "Morning Pickup",
    position: [-18, 0, 1],
    accent: "#7ec601",
    storyAction: "Pickup Groceries",
    shortObjective: "Load fresh grocery crates from the supermarket dock.",
    storyDetails:
      "The day starts gently at the supermarket. Staff hand over fresh produce and pantry boxes for the city route.",
    contentTitle: "Last Mile Delivery",
    contentBody:
      'Last mile delivery accounts for 13–75% of supply chain costs and 40% of e‑commerce emissions!\n\nDelivery robots like Stella have the potential to lower these costs while reducing congestion.',
  },
  {
    id: "office",
    step: 2,
    title: "Office",
    subtitle: "Team Lunch Delivery",
    position: [-10, 0, 1],
    accent: "#f59e0b",
    storyAction: "Drop Off Groceries",
    shortObjective: "Deliver the first grocery batch to the office reception.",
    storyDetails:
      "Office teams receive their lunch and snack restock. The route stays calm and steady as the city wakes up.",
    contentTitle: "Why Delivery Robots?",
    contentBody:
      "Companies purchase delivery robots like Stella in hopes of enabling:\n\n• 24/7 delivery availability\n• Reduced reliance on expensive labor that may experience shortages",
  },
  {
    id: "burger",
    step: 3,
    title: "Burdell's Burgers",
    subtitle: "Kitchen Restock",
    position: [0, 0, 1],
    accent: "#60a5fa",
    storyAction: "Pickup Groceries",
    shortObjective: "Collect chilled ingredients from the burger kitchen.",
    storyDetails:
      "The burger kitchen adds specialty items for the second half of the route, including chilled and boxed essentials.",
    contentTitle: "Robots as Coworkers",
    contentBody:
      "The employees at Burdell's Burgers had to receive training with Stella. Some of them found the cute addition to the team helpful while others found the new processes to be annoying and were afraid that soon, robots like Stella won't just be \"coworkers\" but \"replacements\".",
  },
  {
    id: "police",
    step: 4,
    title: "Police",
    subtitle: "Station Drop",
    position: [8, 0, 1],
    accent: "#a78bfa",
    storyAction: "Drop Off Groceries",
    shortObjective: "Drop a support order at the police station entrance.",
    storyDetails:
      "The station receives a scheduled support delivery for officers on shift, keeping the route helpful and community-focused.",
    contentTitle: "Sharing the Sidewalk",
    contentBody:
      "Delivery robots like Stella often use sidewalks, potentially increasing congestion on already narrow paths. Delivery robots have a duty to share the road so to be warmly welcomed by all city-goers!\n\nSome people also worry if Stella could be hacked, or cause collisions.",
  },
  {
    id: "hospital",
    step: 5,
    title: "Hospital",
    subtitle: "Final Care Delivery",
    position: [24, 0, 1],
    accent: "#f87171",
    storyAction: "Drop Off Care Package",
    shortObjective: "Complete the final delivery at the hospital loading bay.",
    storyDetails:
      "The final stop is a quiet care drop at the hospital. Supplies are handed off, and the route closes on a calm note.",
    contentTitle: "Contactless & Consistent",
    contentBody:
      "Stella provides customers with a consistent contactless delivery experience (when she doesn't get lost!). Some customers are saddened by the lack of human interaction, but others are happy to receive the robot delivery.\n\nEither way, her contactless service can help prevent the spread of diseases.",
  },
];

function ProjectMarkers() {
  return (
    <>
      {checkpointSequence.map((project) => (
        <mesh
          key={project.id}
          position={[project.position[0], 0.5, project.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[1.5, 32]} />
          <meshStandardMaterial color="#f2e4d5" />
        </mesh>
      ))}
    </>
  );
}

function RoutePath() {
  return (
    <>
      {checkpointSequence.slice(0, -1).map((checkpoint, index) => {
        const next = checkpointSequence[index + 1];
        const [x1, , z1] = checkpoint.position;
        const [x2, , z2] = next.position;
        const dx = x2 - x1;
        const dz = z2 - z1;
        const length = Math.hypot(dx, dz);
        const angle = Math.atan2(dz, dx);

        return (
          <mesh
            key={`${checkpoint.id}-${next.id}`}
            position={[(x1 + x2) / 2, 0.03, (z1 + z2) / 2]}
            rotation={[0, -angle, 0]}
            receiveShadow
          >
            <boxGeometry args={[length, 0.05, 1.2]} />
            <meshStandardMaterial color="#ffe7b8" emissive="#e2ab5a" emissiveIntensity={0.24} />
          </mesh>
        );
      })}
    </>
  );
}

function RobotController({ robotRef, enabled = true, onPlayerMoved }) {
  const keys = useKeyboard();
  const moveAudioRef = useRef(null);
  const hasReportedMovementRef = useRef(false);

  useEffect(() => {
    moveAudioRef.current = new Audio("/sounds/moving.mp3");
    moveAudioRef.current.loop = true;
    moveAudioRef.current.volume = 0.7;

    return () => {
      moveAudioRef.current?.pause();
    };
  }, []);

  useFrame((_, delta) => {
    if (!robotRef.current || !enabled) {
      if (moveAudioRef.current && !moveAudioRef.current.paused) {
        moveAudioRef.current.pause();
      }
      return;
    }

    const speed = 5;
    const rotateSpeed = 2.5;

    let isMoving = false;

    if (keys["a"] || keys["arrowleft"]) {
      robotRef.current.rotation.y += rotateSpeed * delta;
      isMoving = true;
    }

    if (keys["d"] || keys["arrowright"]) {
      robotRef.current.rotation.y -= rotateSpeed * delta;
      isMoving = true;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      robotRef.current.quaternion
    );
    let translated = false;

    if (keys["w"] || keys["arrowup"]) {
      robotRef.current.position.addScaledVector(forward, speed * delta);
      isMoving = true;
      translated = true;
    }

    if (keys["s"] || keys["arrowdown"]) {
      robotRef.current.position.addScaledVector(forward, -speed * delta);
      isMoving = true;
      translated = true;
    }

    if (translated && !hasReportedMovementRef.current) {
      hasReportedMovementRef.current = true;
      onPlayerMoved?.();
    }

    const audio = moveAudioRef.current;

    if (audio) {
      if (isMoving) {
        if (audio.paused) {
          audio.currentTime = 0;
          audio.play();
        }
      } else {
        if (!audio.paused) {
          audio.pause();
        }
      }
    }

    robotRef.current.position.x = THREE.MathUtils.clamp(
      robotRef.current.position.x,
      -36,
      38
    );

    robotRef.current.position.z = THREE.MathUtils.clamp(
      robotRef.current.position.z,
      -28,
      8
    );
  });

  return null;
}

function FollowIsoCamera({ targetRef }) {
  const { camera } = useThree();
  const desired = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!targetRef.current) return;

    const robotPos = targetRef.current.position;

    desired.current.set(robotPos.x + 8, 12, robotPos.z + 14);
    camera.position.lerp(desired.current, 0.08);
    camera.lookAt(robotPos.x, 0, robotPos.z);
  });

  return null;
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color="#aaaaaa" />
    </mesh>
  );
}

function Markers() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[6 + i * 1.8, 0.02, 1]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color="#e9dfd4" />
        </mesh>
      ))}
    </>
  );
}

function ProjectZoneDetector({
  robotRef,
  setNearbyProject,
  activeCheckpoint,
  onCheckpointReached,
  activationEnabled,
}) {
  useFrame(() => {
    if (!robotRef.current || !activationEnabled || !activeCheckpoint) {
      setNearbyProject(null);
      return;
    }

    const robotPos = robotRef.current.position;
    const activePos = new THREE.Vector3(...activeCheckpoint.position);
    const activeDistance = robotPos.distanceTo(activePos);

    // --- ADJUST RADIUS HERE ---
    const detectionRadius = 2;

    setNearbyProject(prev => {
      if (activeDistance < detectionRadius) {
        if (prev?.id === activeCheckpoint.id) return prev;
        return activeCheckpoint;
      }
      return null;
    });

    if (activeDistance < (detectionRadius - 0.5)) {
      onCheckpointReached(activeCheckpoint);
    }
  });

  return null;
}

function Scene({
  nearbyProject,
  setNearbyProject,
  activeCheckpoint,
  onCheckpointReached,
  controlsEnabled,
  activationEnabled,
  onPlayerMoved,
  activeCheckpointIndex
}) {
  const robotRef = useRef();

  return (
    <>
      <color attach="background" args={["#c7865b"]} />
      <fog attach="fog" args={["#c7865b", 20, 80]} />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 16, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <OrthographicCamera
        makeDefault
        position={[12, 12, 12]}
        zoom={55}
        near={0.1}
        far={200}
      />

      <Floor />
      <RoutePath />
      <ProjectMarkers activeIndex={activeCheckpointIndex} />
      <Markers />

      <Building path="/models/road.glb" position={[15, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[10, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[5, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[0, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[-5, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[-10, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[-15, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[-20, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[-25, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[-30, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[-35, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[-40, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[-45, 0, 15]} scale={1.5} />
      <Building path="/models/road.glb" position={[-50, 0, 15]} scale={1.5} />

      {/* Desaturated green tiles for contrast with the strobing green highlight */}
      <Building path="/models/green.glb" position={[10, 0, 0.5]} scale={3} />
      <Building path="/models/green.glb" position={[0, 0, 0.5]} scale={3} />
      <Building path="/models/green.glb" position={[-10, 0, 0.5]} scale={3} />
      <Building path="/models/green.glb" position={[-20, 0, 0.5]} scale={3} />
      <Building path="/models/green.glb" position={[-30, 0, 0.5]} scale={3} />
      <Building path="/models/green.glb" position={[-40, 0, 0.5]} scale={3} />
      <Building path="/models/green.glb" position={[-50, 0, 0.5]} scale={3} />

      <Building path="/models/green.glb" position={[10, 0, 23.5]} scale={3} />
      <Building path="/models/green.glb" position={[0, 0, 23.5]} scale={3} />
      <Building path="/models/green.glb" position={[-10, 0, 23.5]} scale={3} />
      <Building path="/models/green.glb" position={[-20, 0, 23.5]} scale={3} />
      <Building path="/models/green.glb" position={[-30, 0, 23.5]} scale={3} />
      <Building path="/models/green.glb" position={[-40, 0, 23.5]} scale={3} />
      <Building path="/models/green.glb" position={[-50, 0, 23.5]} scale={3} />

      <Building path="/models/supermarket.glb" position={[-30, 1, -12]} scale={0.5} />
      <Building path="/models/office.glb" position={[-14, 1, -13.5]} scale={0.5} />
      <Building path="/models/burger.glb" position={[13, 1, -24]} scale={0.5} />
      <Building path="/models/police.glb" position={[12, 1, -12]} scale={0.5} />
      <Building path="/models/hospital.glb" position={[34, 1, -2]} scale={0.5} />
      <Building path="/models/gas.glb" position={[-10, 1, -3]} scale={0.5} />
      <Building
        path="/models/storage.glb"
        position={[-22, 1, 15]}
        scale={0.5}
        rotation={[0, Math.PI, 0]}
      />
      <Building path="/models/orangehouse.glb" position={[-13, 1, -3]} scale={0.5} />
      <Building path="/models/bluehouse.glb" position={[10, 1, -3]} scale={0.5} />
      <Building path="/models/greenhouse.glb" position={[15, 1, -3]} scale={0.5} />

      <DeliveryRobot robotRef={robotRef} />
      <RobotController
        robotRef={robotRef}
        enabled={controlsEnabled}
        onPlayerMoved={onPlayerMoved}
      />
      <FollowIsoCamera targetRef={robotRef} />

      <ProjectZoneDetector
        robotRef={robotRef}
        setNearbyProject={setNearbyProject}
        activeCheckpoint={activeCheckpoint}
        onCheckpointReached={onCheckpointReached}
        activationEnabled={activationEnabled}
      />
    </>
  );
}

function playSound(path, volume = 1) {
  const audio = new Audio(path);
  audio.volume = volume;
  audio.play();
}

function SplashRobotModel() {
  const groupRef = useRef();
  const { scene } = useGLTF("/models/starship_delivery_robot_model.glb");

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.6;
    groupRef.current.rotation.x = -0.15;
    groupRef.current.position.y = -0.4 + Math.sin(t * 1.5) * 0.12;
  });

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 8, 5]} intensity={1.6} />
      <directionalLight position={[-4, 5, 2]} intensity={0.6} />

      <group ref={groupRef} position={[2.5, -0.4, 0]}>
        <primitive
          object={scene.clone()}
          scale={0.3}
          rotation={[0, Math.PI, 0]}
        />
      </group>
    </>
  );
}

// ─── Checkpoint content modal ─────────────────────────────────────────────────
function CheckpointModal({ checkpoint, onContinue, visible }) {
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        onContinue?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onContinue]);

  if (!visible || !checkpoint) return null;

  const accent = checkpoint.accent || "#7ec601";

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      zIndex: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
    }}
      onClick={onContinue}
    >
      <div style={{
        width: "min(520px, calc(100vw - 48px))",
        background: "rgba(10,14,20,0.97)",
        border: `2px solid ${accent}`,
        borderRadius: "20px",
        padding: "54px",
        color: "white",
        boxShadow: `0 0 60px ${accent}44, 0 24px 60px rgba(0,0,0,0.6)`,
        backdropFilter: "blur(12px)",
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: "inline-block",
          padding: "5px 12px",
          borderRadius: "999px",
          background: accent,
          color: "#0a0e14",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          marginBottom: "32px",
        }}>
          STOP {checkpoint.step} — {checkpoint.title.toUpperCase()}
        </div>

        <h2 style={{ margin: "0 0 16px", fontSize: "1.4rem", lineHeight: 1.25 }}>
          {checkpoint.contentTitle}
        </h2>

        <p style={{
          margin: "0 0 20px",
          color: "#d0d8ee",
          lineHeight: 1.75,
          fontSize: "0.97rem",
          whiteSpace: "pre-wrap",
        }}>
          {checkpoint.contentBody}
        </p>

        <button
          onClick={onContinue}
          style={{
            marginTop: 18,
            padding: "11px 24px",
            border: `1.5px solid ${accent}`,
            borderRadius: "999px",
            background: "transparent",
            color: accent,
            cursor: "pointer",
            fontSize: "0.88rem",
            fontWeight: 700,
            letterSpacing: "0.07em",
            fontFamily: "inherit",
            transition: "background 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => { e.target.style.background = accent; e.target.style.color = "#0a0e14"; }}
          onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = accent; }}
        >
          Press space to continue the journey!
        </button>
      </div>
    </div>
  );
}

// ─── Route Complete Modal ──────────────────────────────────────────────────────
function RouteCompleteModal({ visible, onClose }) {
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        onClose?.(); // Call the close function instead of reloading
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      zIndex: 65,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      <div style={{
        width: "min(480px, calc(100vw - 48px))",
        background: "rgba(10,14,20,0.97)",
        border: "2px solid #7ec601",
        borderRadius: "20px",
        padding: "36px 36px",
        color: "white",
        boxShadow: "0 0 80px #7ec60144, 0 24px 60px rgba(0,0,0,0.6)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎉</div>
        <div style={{
          display: "inline-block",
          padding: "5px 14px",
          borderRadius: "999px",
          background: "#7ec601",
          color: "#0a0e14",
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          marginBottom: "16px",
        }}>ROUTE COMPLETE</div>

        <h2 style={{ margin: "0 0 14px", fontSize: "1.6rem" }}>You did it, Stella!</h2>

        <p style={{ color: "#c8d8ee", lineHeight: 1.7, margin: "0 0 10px" }}>
          All deliveries are done. Stay in free-drive mode and keep exploring the city at your own pace.
        </p>

        <button
          onClick={onClose}
          style={{
            marginTop: 24,
            padding: "11px 24px",
            border: `1.5px solid #7ec601`,
            borderRadius: "999px",
            background: "transparent",
            color: "#7ec601",
            cursor: "pointer",
            fontSize: "0.88rem",
            fontWeight: 700,
            letterSpacing: "0.07em",
            fontFamily: "inherit",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#7ec601";
            e.target.style.color = "#0a0e14";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "transparent";
            e.target.style.color = "#7ec601";
          }}
        >
          Press space to free-drive!
        </button>
      </div>
    </div>
  );
}

// ─── Dialog sequence definition ───────────────────────────────────────────────
// Each entry: { text, waitForMove? }
// After checkpoint N is completed, show dialogAfterCheckpoint[N]
const INTRO_DIALOG_SEQUENCE = [
  "Welcome to Delivery World, Stella! You're the new delivery robot in town. Let's complete our first delivery!",
  "Use WASD to move around. Head to the supermarket to pick up some groceries!",
];

const POST_CHECKPOINT_DIALOGS = [
  // after checkpoint 0 (supermarket) — index 0
  "Let's drop off the order to the Office!",
  // after checkpoint 1 (office)
  "Awesome. Let's pick up our next order!",
  // after checkpoint 2 (burger)
  "Great work. Let's deliver the food! Be careful how you share the road...",
  // after checkpoint 3 (police)
  "One last delivery!",
  // after checkpoint 4 (hospital) — game won; route complete modal handles it
  null,
];

export default function App() {
  const [nearbyProject, setNearbyProject] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [isVideoEnding, setIsVideoEnding] = useState(false);
  const [isSceneFadingIn, setIsSceneFadingIn] = useState(false);
  const [hasPlayerMoved, setHasPlayerMoved] = useState(false);
  const [activeCheckpointIndex, setActiveCheckpointIndex] = useState(0);
  const [completedCheckpointCount, setCompletedCheckpointCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogText, setDialogText] = useState("");
  const [dialogQueue, setDialogQueue] = useState([]);

  // Checkpoint content modal state
  const [contentModalCheckpoint, setContentModalCheckpoint] = useState(null);
  const [contentModalVisible, setContentModalVisible] = useState(false);

  const bgmRef = useRef(null);
  const bgmFadeIntervalRef = useRef(null);
  const introVideoRef = useRef(null);
  const activatedCheckpointIdsRef = useRef(new Set());
  const lastCheckpointTriggerAtRef = useRef(0);
  // Track whether controls should be gated by dialog
  const [controlsFrozen, setControlsFrozen] = useState(false);

  const activeCheckpoint = checkpointSequence[activeCheckpointIndex] ?? null;
  const gameplayReady =
    !showSplash && !showIntroVideo && !isVideoEnding && !isSceneFadingIn;
  const checkpointActivationEnabled = gameplayReady && hasPlayerMoved && !contentModalVisible;
  const controlsEnabled = gameplayReady && !controlsFrozen && !contentModalVisible;

  // ── Dialog queue helpers ──────────────────────────────────────────────────
  const showDialog = useCallback((text) => {
    setDialogText(text);
    setDialogVisible(true);
    setControlsFrozen(true);
  }, []);

  const enqueueDialogs = useCallback((texts) => {
    setDialogQueue(texts);
  }, []);

  // When queue changes and dialog is not visible, pop next
  useEffect(() => {
    if (!dialogVisible && dialogQueue.length > 0) {
      const [next, ...rest] = dialogQueue;
      setDialogQueue(rest);
      showDialog(next);
    }
  }, [dialogVisible, dialogQueue, showDialog]);

  const handleDialogContinue = useCallback(() => {
    setDialogVisible(false);
    setControlsFrozen(false);
    // next item from queue will auto-trigger via the effect above
  }, []);

  // ── Trigger intro dialogs after scene fades in ────────────────────────────
  useEffect(() => {
    if (gameplayReady && !hasPlayerMoved && dialogQueue.length === 0 && !dialogVisible) {
      enqueueDialogs(INTRO_DIALOG_SEQUENCE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameplayReady]);

  // ── BGM ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    bgmRef.current = new Audio("/sounds/steampipe.mp3");
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.3;

    return () => {
      if (bgmFadeIntervalRef.current) clearInterval(bgmFadeIntervalRef.current);
      bgmRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!showIntroVideo || !introVideoRef.current) return;

    setIsVideoEnding(false);
    introVideoRef.current.currentTime = 0;
    introVideoRef.current.play().catch(() => {});
  }, [showIntroVideo]);

  const playBgmWithFadeIn = () => {
    const audio = bgmRef.current;
    if (!audio) return;

    if (bgmFadeIntervalRef.current) clearInterval(bgmFadeIntervalRef.current);

    const targetVolume = 0.3;
    const durationMs = 1200;
    const tickMs = 80;
    const steps = Math.max(1, Math.round(durationMs / tickMs));
    const volumeStep = targetVolume / steps;

    audio.volume = 0;
    audio.play().catch(() => {});

    bgmFadeIntervalRef.current = setInterval(() => {
      const next = Math.min(targetVolume, audio.volume + volumeStep);
      audio.volume = next;

      if (next >= targetVolume) {
        clearInterval(bgmFadeIntervalRef.current);
        bgmFadeIntervalRef.current = null;
      }
    }, tickMs);
  };

  // Fade out video audio before it ends
  const startVideoAudioFadeOut = useCallback(() => {
    const video = introVideoRef.current;
    if (!video) return;

    const fadeDurationMs = 800;
    const tickMs = 60;
    const startVolume = video.volume;
    const steps = Math.max(1, Math.round(fadeDurationMs / tickMs));
    const volumeStep = startVolume / steps;

    const interval = setInterval(() => {
      if (!introVideoRef.current) { clearInterval(interval); return; }
      const next = Math.max(0, introVideoRef.current.volume - volumeStep);
      introVideoRef.current.volume = next;
      if (next <= 0) clearInterval(interval);
    }, tickMs);
  }, []);

  // ── Checkpoint reached ────────────────────────────────────────────────────
  const handleCheckpointReached = useCallback((checkpoint) => {
    if (!checkpoint || checkpoint.id !== activeCheckpoint?.id) return;
    if (activatedCheckpointIdsRef.current.has(checkpoint.id)) return;

    const now = Date.now();
    if (now - lastCheckpointTriggerAtRef.current < 800) return;
    lastCheckpointTriggerAtRef.current = now;

    activatedCheckpointIdsRef.current.add(checkpoint.id);

    const nextIndex = activeCheckpointIndex + 1;
    const isLast = nextIndex >= checkpointSequence.length;

    playSound("/sounds/pop.mp3", 0.8);
    setCompletedCheckpointCount(nextIndex);
    setActiveCheckpointIndex(nextIndex);

    if (isLast) setGameWon(true);

    // Show content modal for this checkpoint
    setContentModalCheckpoint(checkpoint);
    setContentModalVisible(true);
  }, [activeCheckpoint, activeCheckpointIndex]);

  const handleContentModalContinue = useCallback(() => {
    setContentModalVisible(false);
    const idx = checkpointSequence.findIndex(c => c.id === contentModalCheckpoint?.id);

    // Queue post-checkpoint narrative dialog if one exists
    const narrativeText = POST_CHECKPOINT_DIALOGS[idx];
    if (narrativeText) {
      enqueueDialogs([narrativeText]);
    }
    setContentModalCheckpoint(null);
  }, [contentModalCheckpoint, enqueueDialogs]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas shadows>
        <Scene
          nearbyProject={nearbyProject}
          setNearbyProject={setNearbyProject}
          activeCheckpoint={activeCheckpoint}
          onCheckpointReached={handleCheckpointReached}
          controlsEnabled={controlsEnabled}
          activationEnabled={checkpointActivationEnabled}
          onPlayerMoved={() => setHasPlayerMoved(true)}
          activeCheckpointIndex={activeCheckpointIndex}
        />
      </Canvas>

      {/* ── Animal Crossing dialog box ── */}
      <DialogBox
        text={dialogText}
        visible={dialogVisible && gameplayReady}
        onContinue={handleDialogContinue}
      />

      {/* ── Checkpoint content modal ── */}
      <CheckpointModal
        checkpoint={contentModalCheckpoint}
        visible={contentModalVisible}
        onContinue={handleContentModalContinue}
      />

      {/* ── Route complete modal ── */}
      <RouteCompleteModal visible={gameWon && !contentModalVisible}
        onClose={() => setGameWon(false)} />

      {/* ── Splash ── */}
      {showSplash && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(20,16,12,0.78)",
            backdropFilter: "blur(4px)",
            zIndex: 30,
            overflow: "hidden",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div style={{ position: "absolute", inset: 0 }}>
            <Canvas camera={{ position: [6, 3, 8], fov: 45 }}>
              <SplashRobotModel />
            </Canvas>
          </div>

          <div
            style={{
              position: "absolute",
              left: "7%",
              top: "50%",
              transform: "translateY(-50%)",
              maxWidth: "520px",
              color: "white",
              zIndex: 2,
            }}
          >
            <h1 style={{ fontSize: "2.8rem", marginBottom: "16px" }}>
              Delivery World
            </h1>

            <p style={{ lineHeight: 1.7, marginBottom: "24px" }}>
              Move through the city with Stella to experience a day in the life of an autonomous delivery robot and learn about her impact.
            </p>

            <button
              onClick={() => {
                setShowSplash(false);
                setShowIntroVideo(true);
                setIsSceneFadingIn(false);
                playSound("/sounds/click.wav", 0.7);
              }}
              style={{
                padding: "12px 22px",
                border: "none",
                borderRadius: "999px",
                background: "white",
                color: "#111",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Enter Experience
            </button>
          </div>
        </div>
      )}

      {/* ── Intro video ── */}
      {showIntroVideo && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "black",
            zIndex: 35,
            opacity: isVideoEnding ? 0 : 1,
            transition: "opacity 550ms ease",
          }}
        >
          <video
            ref={introVideoRef}
            src="/videos/Untitled.mp4"
            autoPlay
            playsInline
            onTimeUpdate={() => {
              const video = introVideoRef.current;
              if (!video) return;
              // Start fading audio 1s before end
              if (video.duration - video.currentTime < 1.0 && video.volume > 0.01) {
                startVideoAudioFadeOut();
              }
            }}
            onEnded={() => {
              if (isVideoEnding) return;

              setIsVideoEnding(true);

              setTimeout(() => {
                setShowIntroVideo(false);
                setIsVideoEnding(false);
                setIsSceneFadingIn(true);
                playBgmWithFadeIn();

                setTimeout(() => {
                  setIsSceneFadingIn(false);
                }, 850);
              }, 550);
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 100%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 62%, rgba(0,0,0,0.68) 100%)",
              pointerEvents: "none",
            }}
          />
        </div>
      )}

      {isSceneFadingIn && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "black",
            zIndex: 34,
            opacity: 1,
            animation: "sceneFadeIn 850ms ease forwards",
            pointerEvents: "none",
          }}
        />
      )}

      <style>
        {`
          @keyframes sceneFadeIn {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}
      </style>
    </div>
  );
}