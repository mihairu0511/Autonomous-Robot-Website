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

const projectZones = [
  {
    id: "frameworks",
    position: [-15, 0, 0],
    title: "Frameworks",
    subtitle: "Theoretical Frameworks for Technology Acceptance",
    description: "Robot delivery system for supermarkets.",
    accent: "#7ec601",
    image: "/images/frameworks.png",
  },
  {
    id: "functionality",
    position: [-5, 0, 0],
    title: "Benefits vs Risk",
    subtitle: "Functional Benefits vs. Perceived Risks",
    description: "Robot delivery system for supermarkets.",
    accent: "#f59e0b",
    image: "/images/functionality.jpg",
  },
  {
    id: "social",
    position: [5, 0, 0],
    title: "Cultural Context",
    subtitle: "Social Influence and Cultural Context",
    description: "Autonomous delivery in medical environments.",
    accent: "#60a5fa",
    image: "/images/culture.jpg",
  },
  {
    id: "HRI",
    position: [15, 0, 0],
    title: "HRI",
    subtitle: "Human-Robot Interaction and Social Perception",
    description: "Autonomous delivery in office environments.",
    accent: "#a78bfa",
    image: "/images/HRI.png",
  },
  {
    id: "policy",
    position: [25, 0, 0],
    title: "Policy and Regulation",
    subtitle: "Societal and Policy Implications",
    description: "Autonomous food delivery in urban environments.",
    accent: "#f87171",
    image: "/images/policy.png",
  },
];

function ProjectMarkers() {
  return (
    <>
      {projectZones.map((project) => (
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

function RobotController({ robotRef, enabled = true }) {
  const keys = useKeyboard();
  const moveAudioRef = useRef(null);

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

    if (keys["w"] || keys["arrowup"]) {
      robotRef.current.position.addScaledVector(forward, speed * delta);
      isMoving = true;
    }

    if (keys["s"] || keys["arrowdown"]) {
      robotRef.current.position.addScaledVector(forward, -speed * delta);
      isMoving = true;
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
      -25,
      25
    );

    robotRef.current.position.z = THREE.MathUtils.clamp(
      robotRef.current.position.z,
      -3,
      3
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

function ProjectZoneDetector({ robotRef, setNearbyProject }) {
  useFrame(() => {
    if (!robotRef.current) return;

    const robotPos = robotRef.current.position;
    let closest = null;
    let closestDistance = Infinity;

    for (const zone of projectZones) {
      const zonePos = new THREE.Vector3(...zone.position);
      const distance = robotPos.distanceTo(zonePos);

      if (distance < 3 && distance < closestDistance) {
        closest = zone;
        closestDistance = distance;
      }
    }

    setNearbyProject((prev) => {
      if (prev?.id === closest?.id) return prev;
      return closest;
    });
  });

  return null;
}

function ProjectPreview({ project, onClick }) {
  if (!project) return null;

  const [x, y, z] = project.position;
  const accent = project.accent || "#ffffff";

  return (
    <>
      <Float speed={2} rotationIntensity={0.08} floatIntensity={0.45}>
        <group position={[x, y + 4.2, z]}>
          <Html center distanceFactor={10} transform>
            <div
              onClick={onClick}
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
                cursor: "pointer",
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
                IN RANGE
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
                <span style={{ color: accent, fontWeight: 700 }}>OPEN ↗</span>
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
  selectedProject,
  setNearbyProject,
  setSelectedProject,
  controlsEnabled,
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
      <RobotController robotRef={robotRef} enabled={controlsEnabled} />
      <FollowIsoCamera targetRef={robotRef} />

      <ProjectZoneDetector
        robotRef={robotRef}
        setNearbyProject={setNearbyProject}
      />

      <ProjectPreview
        project={selectedProject ? null : nearbyProject}
        onClick={() => {
          if (nearbyProject) {
            playSound("/sounds/click.wav", 0.7);
            setSelectedProject(nearbyProject);
            setNearbyProject(null);
          }
        }}
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
  const [selectedProject, setSelectedProject] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const bgmRef = useRef(null);
  const previewAudioRef = useRef(null);
  const lastPreviewIdRef = useRef(null);

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

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas shadows>
        <Scene
          nearbyProject={nearbyProject}
          selectedProject={selectedProject}
          setNearbyProject={setNearbyProject}
          setSelectedProject={setSelectedProject}
          controlsEnabled={!showSplash}
        />
      </Canvas>

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
              Explore a small interactive city using a delivery robot. Move through
              streets, discover locations, and interact with projects as if navigating
              a real environment.
            </p>

            <p style={{ lineHeight: 1.7, marginBottom: "24px" }}>
              Each location reveals a preview. Click to dive deeper into the work.
            </p>

            <button
              onClick={() => {
                setShowSplash(false);
                playSound("/sounds/click.wav", 0.7);
                bgmRef.current?.play();
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

      {selectedProject && (
        <div
          onClick={() => setSelectedProject(null)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 40,
            padding: "24px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            style={{
              width: "min(920px, 92vw)",
              minHeight: "520px",
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr",
              background: "rgba(20,20,24,0.96)",
              border: `1px solid ${selectedProject.accent || "#333"}`,
              borderRadius: "28px",
              overflow: "hidden",
              boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                position: "relative",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    borderRadius: "999px",
                    background: selectedProject.accent || "#444",
                    color: "white",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    marginBottom: "18px",
                  }}
                >
                  PROJECT PREVIEW
                </div>

                <h2
                  style={{
                    margin: "0 0 10px 0",
                    color: "white",
                    fontSize: "2.2rem",
                    lineHeight: 1.05,
                  }}
                >
                  {selectedProject.title}
                </h2>

                <p
                  style={{
                    margin: "0 0 22px 0",
                    color: "#cfcfd6",
                    fontSize: "1rem",
                  }}
                >
                  {selectedProject.subtitle}
                </p>

                <p
                  style={{
                    margin: 0,
                    color: "#b7b7c2",
                    lineHeight: 1.75,
                    fontSize: "1rem",
                    maxWidth: "52ch",
                  }}
                >
                  {selectedProject.description}
                </p>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  {(selectedProject.tech || []).map((item) => (
                    <span
                      key={item}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.08)",
                        color: "white",
                        fontSize: "0.9rem",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                background: "#111216",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <button
                onClick={() => {
                  playSound("/sounds/click.wav", 0.7);
                  setSelectedProject(null);
                }}
                style={{
                  alignSelf: "flex-end",
                  width: "42px",
                  height: "42px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                }}
              >
                ×
              </button>

              <div
                style={{
                  flex: 1,
                  marginTop: "16px",
                  borderRadius: "22px",
                  overflow: "hidden",
                  background:
                    selectedProject.image
                      ? `center / cover no-repeat url(${selectedProject.image})`
                      : `linear-gradient(135deg, ${selectedProject.accent || "#444"}22, rgba(255,255,255,0.04))`,
                  border: "1px solid rgba(255,255,255,0.08)",
                  minHeight: "320px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!selectedProject.image && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "white",
                      padding: "24px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "3rem",
                        marginBottom: "12px",
                      }}
                    >
                      ⬡
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: "#d7d7df",
                        fontSize: "1rem",
                      }}
                    >
                      Project visual preview
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}