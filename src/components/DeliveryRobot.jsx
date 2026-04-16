import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";

export default function DeliveryRobot({ robotRef }) {
  const { scene } = useGLTF("/models/starship_delivery_robot_model.glb");

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <group ref={robotRef} position={[-26, 0.5, 0]} rotation={[0, -Math.PI/2, 0]}>
      <primitive object={scene} scale={0.3} rotation={[0, Math.PI, 0]} />
    </group>
  );
}