import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, Text, Float, Html, useGLTF } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import DeliveryRobot from "./components/DeliveryRobot";
import Building from "./components/building";

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

  // setup audio once
  useEffect(() => {
    moveAudioRef.current = new Audio("/sounds/moving.mp3");
    moveAudioRef.current.loop = true;
    moveAudioRef.current.volume = 0.7;

    return () => {
      moveAudioRef.current?.pause();
    };
  }, []);

  useFrame((_, delta) => {
    if (!robotRef.current || !enabled) return;

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
    if (!robotRef.current) return;

    if (!activationEnabled) {
      return;
    }

    if (!activeCheckpoint) {
      setNearbyProject(null);
      return;
    }

    const robotPos = robotRef.current.position;
    const activePos = new THREE.Vector3(...activeCheckpoint.position);
    const activeDistance = robotPos.distanceTo(activePos);

    setNearbyProject((prev) => {
      if (activeDistance < 6) {
        if (prev?.id === activeCheckpoint.id) return prev;
        return activeCheckpoint;
      }

      if (prev === null) return prev;
      return null;
    });

    if (activeDistance < 5.5) {
      onCheckpointReached(activeCheckpoint);
    }
  });

  return null;
}

function ProjectPreview({ project, isActiveCheckpoint = false }) {
  if (!project) return null;

  const [x, y, z] = project.position;
  const accent = project.accent || "#ffffff";

  return (
    <>
      <Float speed={2} rotationIntensity={0.08} floatIntensity={0.45}>
        <group position={[x, y + 4.2, z]}>
          <Html center distanceFactor={10} transform>
            <div
              style={{
                width: "200px",
                borderRadius: "22px",
                padding: "16px",
                background: "rgba(18,18,22,0.92)",
                color: "white",
                border: `1px solid ${accent}`,
                boxShadow: `0 18px 50px rgba(0,0,0,0.28), 0 0 24px ${accent}33`,
                backdropFilter: "blur(10px)",
                fontFamily: "Arial, sans-serif",
                userSelect: "none",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  background: accent,
                  color: "white",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  marginBottom: "12px",
                }}
              >
                {isActiveCheckpoint ? "ACTIVE CHECKPOINT" : "IN RANGE"}
              </div>

              <div
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  marginBottom: "6px",
                }}
              >
                {project.title}
              </div>

              <div
                style={{
                  fontSize: "0.84rem",
                  color: "#cfcfd8",
                  marginBottom: "12px",
                }}
              >
                {project.subtitle || "Interactive project preview"}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.8rem",
                  color: "#b9b9c3",
                }}
              >
                <span style={{ color: accent, fontWeight: 700 }}>
                  {project.storyAction}
                </span>
              </div>
            </div>
          </Html>
        </group>
      </Float>

      <mesh position={[x, y + 0.06, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.65, 48]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.35}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh position={[x, y + 0.07, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 32]} />
        <meshStandardMaterial
          color="#fff"
          emissive="#fff"
          emissiveIntensity={0.25}
        />
      </mesh>
    </>
  );
}

function Scene({
  nearbyProject,
  setNearbyProject,
  activeCheckpoint,
  onCheckpointReached,
  controlsEnabled,
  activationEnabled,
  onPlayerMoved,
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
      <ProjectMarkers />
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
      <Building path="/models/road.glb" position={[-55, 0, 15]} scale={1.5} />

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

      <ProjectPreview
        project={nearbyProject}
        isActiveCheckpoint={nearbyProject?.id === activeCheckpoint?.id}
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
  const [checkpointEvent, setCheckpointEvent] = useState(null);
  const [storyLog, setStoryLog] = useState([
    "Route briefing: Start at the supermarket and follow the highlighted road through all five city stops.",
  ]);
  const bgmRef = useRef(null);
  const bgmFadeIntervalRef = useRef(null);
  const previewAudioRef = useRef(null);
  const lastPreviewIdRef = useRef(null);
  const introVideoRef = useRef(null);
  const activatedCheckpointIdsRef = useRef(new Set());
  const lastCheckpointTriggerAtRef = useRef(0);

  const activeCheckpoint = checkpointSequence[activeCheckpointIndex] ?? null;
  const gameplayReady =
    !showSplash && !showIntroVideo && !isVideoEnding && !isSceneFadingIn;
  const checkpointActivationEnabled = gameplayReady && hasPlayerMoved;

  useEffect(() => {
    const currentId = nearbyProject?.id ?? null;

    if (currentId && currentId !== lastPreviewIdRef.current) {
      const audio = previewAudioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play();
      }
    }
 
    lastPreviewIdRef.current = currentId;
  }, [nearbyProject]);

  useEffect(() => {
    bgmRef.current = new Audio("/sounds/steampipe.mp3");
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.3;

    return () => {
      if (bgmFadeIntervalRef.current) {
        clearInterval(bgmFadeIntervalRef.current);
      }
      bgmRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    previewAudioRef.current = new Audio("/sounds/pop.mp3");
    previewAudioRef.current.volume = 0.7;

    return () => {
      previewAudioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!showIntroVideo || !introVideoRef.current) return;

    setIsVideoEnding(false);
    introVideoRef.current.currentTime = 0;
    introVideoRef.current.play().catch(() => {
      // Autoplay can fail depending on browser policy; keep controls available.
    });
  }, [showIntroVideo]);

  const playBgmWithFadeIn = () => {
    const audio = bgmRef.current;
    if (!audio) return;

    if (bgmFadeIntervalRef.current) {
      clearInterval(bgmFadeIntervalRef.current);
    }

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

  useEffect(() => {
    if (!checkpointEvent) return;

    const timeoutId = setTimeout(() => {
      setCheckpointEvent(null);
    }, 4500);

    return () => clearTimeout(timeoutId);
  }, [checkpointEvent]);

  const handleCheckpointReached = (checkpoint) => {
    if (!checkpoint || checkpoint.id !== activeCheckpoint?.id) return;
    if (activatedCheckpointIdsRef.current.has(checkpoint.id)) return;

    const now = Date.now();
    if (now - lastCheckpointTriggerAtRef.current < 800) return;
    lastCheckpointTriggerAtRef.current = now;

    activatedCheckpointIdsRef.current.add(checkpoint.id);

    const nextCheckpoint = checkpointSequence[activeCheckpointIndex + 1] ?? null;

    playSound("/sounds/pop.mp3", 0.8);
    setCompletedCheckpointCount(activeCheckpointIndex + 1);
    setStoryLog((prev) => [
      ...prev,
      `Stop ${checkpoint.step}: ${checkpoint.storyAction} at ${checkpoint.title}. ${checkpoint.storyDetails}`,
    ]);
    setCheckpointEvent({
      id: checkpoint.id,
      accent: checkpoint.accent,
      title: `${checkpoint.storyAction} Complete`,
      summary: checkpoint.storyDetails,
      nextText: nextCheckpoint
        ? `Next objective: ${nextCheckpoint.storyAction} at ${nextCheckpoint.title}.`
        : "Story route complete. Keep cruising and explore the city at your own pace.",
    });
    if (!nextCheckpoint) {
      setGameWon(true);
    }
    setActiveCheckpointIndex((prev) =>
      Math.min(prev + 1, checkpointSequence.length)
    );
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas shadows>
        <Scene
          nearbyProject={nearbyProject}
          setNearbyProject={setNearbyProject}
          activeCheckpoint={activeCheckpoint}
          onCheckpointReached={handleCheckpointReached}
          controlsEnabled={gameplayReady}
          activationEnabled={checkpointActivationEnabled}
          onPlayerMoved={() => setHasPlayerMoved(true)}
        />
      </Canvas>

      {!showSplash && !showIntroVideo && (
        <div
          style={{
            position: "absolute",
            top: "18px",
            left: "18px",
            zIndex: 25,
            width: "min(420px, calc(100vw - 36px))",
            background: "rgba(15,18,24,0.86)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "16px",
            color: "white",
            padding: "16px 18px",
            backdropFilter: "blur(8px)",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div style={{ fontSize: "0.78rem", letterSpacing: "0.08em", opacity: 0.78 }}>
            DELIVERY STORY ROUTE
          </div>
          <h3 style={{ margin: "8px 0 8px", fontSize: "1.12rem" }}>
            {activeCheckpoint
              ? `Checkpoint ${activeCheckpoint.step}/${checkpointSequence.length}: ${activeCheckpoint.storyAction}`
              : "Story Route Complete"}
          </h3>
          <p style={{ margin: 0, color: "#d8deea", lineHeight: 1.55 }}>
            {activeCheckpoint
              ? activeCheckpoint.shortObjective
              : "All deliveries are done. Stay in free-drive mode and keep exploring."}
          </p>
          <p
            style={{
              margin: "10px 0 0",
              color: "#aab5cb",
              fontSize: "0.88rem",
              lineHeight: 1.45,
            }}
          >
            Checkpoints auto-activate when your robot enters the active zone.
          </p>
          <div style={{ marginTop: "12px", fontSize: "0.86rem", color: "#c4cee1" }}>
            Progress: {completedCheckpointCount}/{checkpointSequence.length}
          </div>

          {!hasPlayerMoved && gameplayReady && (
            <div
              style={{
                marginTop: "10px",
                color: "#ffe8b3",
                fontSize: "0.84rem",
                lineHeight: 1.4,
              }}
            >
              Move the robot to begin checkpoint tracking.
            </div>
          )}

          <div
            style={{
              marginTop: "12px",
              borderTop: "1px solid rgba(255,255,255,0.16)",
              paddingTop: "10px",
              color: "#cdd7eb",
              fontSize: "0.84rem",
              lineHeight: 1.5,
            }}
          >
            Story Log: {storyLog[Math.max(0, storyLog.length - 1)]}
          </div>
        </div>
      )}

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

            <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
              "Last mile delivery accounts for 13–75% of supply chain cost and 40% of e‑commerce emissions. The initial costs in deploying mobile autonomous robots may be expensive, but these costs are expected to be offset by lower maintenance costs, fuel savings, and potential tax credits or subsidies.
            </p>

            <p style={{ lineHeight: 1.7, marginBottom: "24px" }}>
              With these cost saving promises, delivery robot Stella's company has partnered with local restaurants and supermarkets.
            </p>

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

      {checkpointEvent && (
        <div
          style={{
            position: "absolute",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            top: "18px",
            right: "18px",
            zIndex: 40,
            width: "min(420px, calc(100vw - 36px))",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              background: "rgba(14,18,24,0.94)",
              border: `1px solid ${checkpointEvent.accent || "#3b82f6"}`,
              borderRadius: "16px",
              boxShadow: "0 24px 50px rgba(0,0,0,0.38)",
              padding: "16px 18px",
              color: "white",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: "999px",
                background: checkpointEvent.accent || "#3b82f6",
                color: "white",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                marginBottom: "10px",
              }}
            >
              CHECKPOINT UPDATE
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>
              {checkpointEvent.title}
            </h3>

            <p style={{ margin: "0 0 8px", color: "#d9e1f2", lineHeight: 1.55 }}>
              {checkpointEvent.summary}
            </p>

            <p style={{ margin: 0, color: "#aebdd8", fontSize: "0.92rem" }}>
              {checkpointEvent.nextText}
            </p>
          </div>
        </div>
      )}

      {gameWon && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 45,
            padding: "10px 18px",
            borderRadius: "999px",
            background: "rgba(126,198,1,0.92)",
            color: "#102200",
            fontWeight: 700,
            letterSpacing: "0.04em",
            fontFamily: "Arial, sans-serif",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          }}
        >
          ROUTE COMPLETE - YOU WIN
        </div>
      )}

      <style>
        {`
          @keyframes sceneFadeIn {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `}
      </style>
    </div>
  );
}