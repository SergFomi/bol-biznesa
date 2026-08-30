import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Camera } from "three";
import { ToonProp } from "@/components/toon-prop";
import { C } from "@/lib/palette";

export type Pose = {
  x: number;
  y: number;
  z: number;
  lx: number;
  ly: number;
  lz: number;
};

export const POSES: [Pose, Pose] = [
  { x: 2.55, y: 1.62, z: 4.35, lx: 0.15, ly: 0.92, lz: -0.4 },
  { x: 2.35, y: 1.42, z: -9.55, lx: 0.2, ly: 0.8, lz: -12.85 },
];

export type FlyRef = {
  from: Pose;
  to: Pose;
  start: number;
  duration: number;
  active: boolean;
  target: 0 | 1;
  reduced: boolean;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    lx: lerp(a.lx, b.lx, t),
    ly: lerp(a.ly, b.ly, t),
    lz: lerp(a.lz, b.lz, t),
  };
}

function easeFly(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function applyPose(camera: Camera, p: Pose) {
  camera.position.set(p.x, p.y, p.z);
  camera.lookAt(p.lx, p.ly, p.lz);
}

function CameraRig({
  flyRef,
  poseRef,
  onMid,
}: {
  flyRef: MutableRefObject<FlyRef>;
  poseRef: MutableRefObject<Pose>;
  onMid: (screen: 0 | 1) => void;
}) {
  const idle = useRef(0);
  const shown = useRef<0 | 1>(0);

  useFrame(({ camera }, dt) => {
    const d = Math.min(dt, 0.1);
    idle.current += d;
    const fly = flyRef.current;

    let pose: Pose;
    if (fly.active) {
      const t = Math.min(1, (performance.now() - fly.start) / fly.duration);
      const k = easeFly(t);
      pose = lerpPose(fly.from, fly.to, k);
      const next: 0 | 1 = k > 0.38 ? fly.target : fly.target === 1 ? 0 : 1;
      if (next !== shown.current) {
        shown.current = next;
        onMid(next);
      }
      if (t >= 1) {
        fly.active = false;
        pose = { ...POSES[fly.target] };
        shown.current = fly.target;
        onMid(fly.target);
      }
    } else {
      pose = { ...POSES[fly.target] };
      const i = idle.current;
      pose.x += Math.sin(i * 0.32) * 0.06;
      pose.y += Math.cos(i * 0.24) * 0.03;
      pose.lx += Math.sin(i * 0.18) * 0.04;
    }
    poseRef.current = pose;
    applyPose(camera, pose);
  });

  return null;
}

function RoomShell({ accent }: { accent: "lime" | "ember" }) {
  const wall = accent === "lime" ? C.wallLit : "#241810";
  const glow = accent === "lime" ? C.lime : C.ember;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshToonMaterial color={C.floor} />
      </mesh>
      <mesh position={[0, 1.55, -5]} receiveShadow>
        <boxGeometry args={[10, 3.1, 0.14]} />
        <meshToonMaterial color={C.wall} />
      </mesh>
      <mesh position={[-5, 1.55, 0]} receiveShadow>
        <boxGeometry args={[0.14, 3.1, 10]} />
        <meshToonMaterial color={wall} />
      </mesh>
      <mesh position={[5, 1.55, 0]} receiveShadow>
        <boxGeometry args={[0.14, 3.1, 10]} />
        <meshToonMaterial color={C.wall} />
      </mesh>
      <mesh position={[-4.92, 1.65, 0.2]}>
        <planeGeometry args={[0.06, 1.9]} />
        <meshBasicMaterial color={glow} />
      </mesh>
      <pointLight position={[-4.1, 1.7, 0.3]} color={glow} intensity={7} distance={10} />
    </group>
  );
}

function Office() {
  return (
    <group>
      <RoomShell accent="lime" />
      <ToonProp url="/models/rugRectangle.glb" position={[0.4, 0, 0.4]} scale={2.2} />
      <ToonProp url="/models/desk.glb" position={[0.6, 0, -0.6]} rotation={[0, -0.4, 0]} />
      <ToonProp url="/models/chairDesk.glb" position={[0.95, 0, 0.55]} rotation={[0, 3.3, 0]} />
      <ToonProp url="/models/chairDesk.glb" position={[-0.55, 0, 0.15]} rotation={[0, 0.6, 0]} />
      <ToonProp url="/models/computerScreen.glb" position={[0.35, 0.78, -0.85]} rotation={[0, -0.4, 0]} />
      <ToonProp url="/models/computerKeyboard.glb" position={[0.55, 0.78, -0.45]} rotation={[0, -0.4, 0]} />
      <ToonProp url="/models/lampRoundTable.glb" position={[1.35, 0.78, -0.95]} />
      <ToonProp url="/models/bookcaseOpen.glb" position={[-3.6, 0, -3.8]} />
      <ToonProp url="/models/books.glb" position={[-3.55, 1.15, -3.7]} />
      <ToonProp url="/models/loungeChair.glb" position={[3.2, 0, 1.6]} rotation={[0, -0.9, 0]} />
      <ToonProp url="/models/pottedPlant.glb" position={[-3.4, 0, 2.4]} />
      <ToonProp url="/models/lampRoundFloor.glb" position={[3.6, 0, -3.2]} />
      <ToonProp url="/models/doorway.glb" position={[0.2, 0, -4.92]} />
      <pointLight position={[1.3, 1.4, -0.8]} color="#fff4d4" intensity={4} distance={6} />
    </group>
  );
}

function WarRoom() {
  return (
    <group position={[0, 0, -12.4]}>
      <RoomShell accent="ember" />
      <ToonProp url="/models/tableCoffee.glb" position={[0.2, 0, 0.3]} />
      <ToonProp url="/models/cardboardBoxOpen.glb" position={[-0.45, 0.42, 0.55]} rotation={[0, 0.4, 0]} />
      <ToonProp url="/models/cardboardBoxOpen.glb" position={[0.55, 0.42, 0.15]} rotation={[0, -0.5, 0]} />
      <ToonProp url="/models/stoolBar.glb" position={[-1.3, 0, 0.8]} rotation={[0, 0.4, 0]} />
      <ToonProp url="/models/stoolBar.glb" position={[1.5, 0, 0.5]} rotation={[0, -0.6, 0]} />
      <ToonProp url="/models/stoolBar.glb" position={[0.2, 0, 1.7]} />
      <ToonProp url="/models/chair.glb" position={[-2.4, 0, -1.6]} rotation={[0, 0.8, 0]} />
      <ToonProp url="/models/televisionModern.glb" position={[0.1, 0.9, -4.6]} scale={1.4} />
      <ToonProp url="/models/sideTable.glb" position={[3.3, 0, -2.4]} />
      <ToonProp url="/models/plantSmall2.glb" position={[3.3, 0.7, -2.4]} />
      <ToonProp url="/models/lampRoundFloor.glb" position={[-3.6, 0, 2.6]} />
      <ToonProp url="/models/cardboardBoxOpen.glb" position={[-3.2, 0, -3.4]} rotation={[0, 0.7, 0]} />
      <pointLight position={[0.2, 1.2, 0.3]} color="#ff8a3a" intensity={5} distance={8} />
    </group>
  );
}

export function ComicWorld({
  flyRef,
  poseRef,
  onMid,
}: {
  flyRef: MutableRefObject<FlyRef>;
  poseRef: MutableRefObject<Pose>;
  onMid: (screen: 0 | 1) => void;
}) {
  return (
    <>
      <color attach="background" args={[C.void]} />
      <fog attach="fog" args={[C.void, 10, 26]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#f3f0e8", "#0b0b0c", 0.5]} />
      <directionalLight
        position={[4, 8, 6]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <Office />
      <WarRoom />
      <CameraRig flyRef={flyRef} poseRef={poseRef} onMid={onMid} />
    </>
  );
}
