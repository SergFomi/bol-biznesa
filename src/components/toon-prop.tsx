import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Color,
  DataTexture,
  Mesh,
  MeshToonMaterial,
  NearestFilter,
  RGBAFormat,
  type Material,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

let gradient: DataTexture | null = null;

function toonRamp() {
  if (gradient) return gradient;
  const data = new Uint8Array([80, 80, 80, 255, 165, 165, 165, 255, 255, 255, 255, 255]);
  gradient = new DataTexture(data, 3, 1, RGBAFormat);
  gradient.minFilter = NearestFilter;
  gradient.magFilter = NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

type PropProps = {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  tint?: string;
};

export function ToonProp({ url, position, rotation, scale = 1, tint }: PropProps) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    const root = clone(gltf.scene);
    const ramp = toonRamp();
    const tintColor = tint ? new Color(tint) : null;
    root.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      const orig = mesh.material as Material & {
        map?: MeshToonMaterial["map"];
        color?: Color;
      };
      mesh.material = new MeshToonMaterial({
        map: orig.map ?? null,
        color: tintColor ?? orig.color?.clone() ?? new Color("#d0d0d0"),
        gradientMap: ramp,
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return root;
  }, [gltf, tint]);

  return <primitive object={scene} position={position} rotation={rotation} scale={scale} />;
}

const PRELOAD = [
  "/models/desk.glb",
  "/models/chairDesk.glb",
  "/models/chair.glb",
  "/models/computerScreen.glb",
  "/models/computerKeyboard.glb",
  "/models/lampRoundFloor.glb",
  "/models/lampRoundTable.glb",
  "/models/bookcaseOpen.glb",
  "/models/books.glb",
  "/models/pottedPlant.glb",
  "/models/plantSmall2.glb",
  "/models/loungeChair.glb",
  "/models/tableCoffee.glb",
  "/models/cardboardBoxOpen.glb",
  "/models/stoolBar.glb",
  "/models/rugRectangle.glb",
  "/models/televisionModern.glb",
  "/models/sideTable.glb",
  "/models/doorway.glb",
];

if (typeof window !== "undefined") {
  for (const url of PRELOAD) useGLTF.preload(url);
}
