import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Pose = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
};

const POSES: [Pose, Pose] = [
  { x: 10, y: -55, z: 310, rx: -12, ry: 12, rz: 0 },
  { x: 190, y: -35, z: -1110, rx: -10, ry: -6, rz: 0 },
];

const FLY_MS = 640;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    rz: lerp(a.rz, b.rz, t),
  };
}

/** Slow → whip → hard stop. */
function easeFly(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function poseToCss(p: Pose) {
  return `rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) translate3d(${-p.x}px, ${-p.y}px, ${-p.z}px)`;
}

export function ThresholdStage() {
  const worldRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<Pose>({ ...POSES[0] });
  const targetRef = useRef<0 | 1>(0);
  const flyRef = useRef<{
    from: Pose;
    to: Pose;
    start: number;
    duration: number;
  } | null>(null);
  const idleRef = useRef(0);
  const touchY = useRef<number | null>(null);
  const [screen, setScreen] = useState<0 | 1>(0);
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();

    const apply = (pose: Pose, blur: number) => {
      poseRef.current = pose;
      world.style.transform = poseToCss(pose);
      void blur;
    };

    const goTo = (next: 0 | 1) => {
      if (targetRef.current === next) return;
      targetRef.current = next;
      const duration = reduced ? 1 : FLY_MS;
      flyRef.current = {
        from: { ...poseRef.current },
        to: { ...POSES[next] },
        start: performance.now(),
        duration,
      };
      setFlying(true);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 6) return;
      if (e.deltaY > 0) goTo(1);
      else goTo(0);
    };

    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "Spacebar"].includes(e.key)) {
        e.preventDefault();
        goTo(1);
      }
      if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        goTo(0);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchY.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const start = touchY.current;
      touchY.current = null;
      const end = e.changedTouches[0]?.clientY;
      if (start == null || end == null) return;
      const dy = start - end;
      if (Math.abs(dy) < 36) return;
      if (dy > 0) goTo(1);
      else goTo(0);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      idleRef.current += dt;

      let pose: Pose;
      let blur = 0;
      const fly = flyRef.current;
      if (fly) {
        const t = Math.min(1, (now - fly.start) / fly.duration);
        const k = easeFly(t);
        pose = lerpPose(fly.from, fly.to, k);
        blur = Math.sin(k * Math.PI);
        const shown: 0 | 1 = k > 0.38 ? targetRef.current : targetRef.current === 1 ? 0 : 1;
        setScreen((prev) => (prev === shown ? prev : shown));
        if (t >= 1) {
          flyRef.current = null;
          pose = { ...POSES[targetRef.current] };
          blur = 0;
          setFlying(false);
          setScreen(targetRef.current);
        }
      } else {
        pose = { ...POSES[targetRef.current] };
        const idle = idleRef.current;
        pose.x += Math.sin(idle * 0.35) * 5;
        pose.y += Math.cos(idle * 0.27) * 3;
        pose.ry += Math.sin(idle * 0.22) * 0.7;
        pose.rx += Math.cos(idle * 0.18) * 0.35;
      }

      apply(pose, blur);
      raf = requestAnimationFrame(tick);
    };

    apply(POSES[0], 0);
    raf = requestAnimationFrame(tick);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div
      className={`stage${flying ? " is-flying" : ""}`}
      role="application"
      aria-label="Два экрана. Скролл переносит камеру."
    >
      <div className="viewport">
        <div ref={worldRef} className="world">
          <section className="scene scene-a" aria-hidden="true">
            <div className="face floor" />
            <div className="face back" />
            <div className="face left" />
            <div className="face right" />
            <div className="face pillar" />
            <div className="face plinth" />
            <div className="face block" />
            <div className="face beam" />
          </section>
          <section className="scene scene-b" aria-hidden="true">
            <div className="face floor" />
            <div className="face back" />
            <div className="face arch" />
            <div className="face left" />
            <div className="face slab" />
            <div className="face obelisk" />
            <div className="face pool" />
          </section>
        </div>
      </div>

      <div className="vignette" />

      <div className="overlay">
        <span className="mark tabular-nums">{screen === 0 ? "01 / 02" : "02 / 02"}</span>

        <div className="relative min-h-[11rem]">
          <div className={`copy absolute inset-x-0 top-0 ${screen === 0 ? "is-here" : "is-away"}`}>
            <p className="kicker">экран первый</p>
            <h1 className="title">Зал</h1>
            <p className="lede">Тёплый короб. Скролл вниз — камера летит во второй экран.</p>
          </div>
          <div className={`copy absolute inset-x-0 top-0 ${screen === 1 ? "is-here" : "is-away"}`}>
            <p className="kicker">экран второй</p>
            <h1 className="title">Двор</h1>
            <p className="lede">Холоднее и дальше. Скролл вверх возвращает назад.</p>
          </div>
        </div>

        <div className="hint" aria-hidden="true">
          {screen === 0 ? (
            <>
              <span>{flying ? "полёт" : "скролл вниз"}</span>
              <ChevronDown className="hint-icon size-5 text-rust" strokeWidth={1.5} />
            </>
          ) : (
            <>
              <ChevronUp className="hint-icon size-5 text-steel" strokeWidth={1.5} />
              <span>{flying ? "полёт" : "скролл вверх"}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
