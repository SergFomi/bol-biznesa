import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { ComicWorld, POSES, type FlyRef, type Pose } from "@/components/comic-world";

const FLY_MS = 700;
const TG = "https://t.me/Thukydides";

function copyPose(p: Pose): Pose {
  return { ...p };
}

export function ComicStage() {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<0 | 1>(0);
  const [flying, setFlying] = useState(false);
  const poseNow = useRef<Pose>(copyPose(POSES[0]));
  const flyRef = useRef<FlyRef>({
    from: copyPose(POSES[0]),
    to: copyPose(POSES[0]),
    start: 0,
    duration: FLY_MS,
    active: false,
    target: 0,
    reduced: false,
  });
  const touchY = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    flyRef.current.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const goTo = useCallback((next: 0 | 1) => {
    const fly = flyRef.current;
    if (fly.target === next && !fly.active) return;
    if (fly.target === next && fly.active) return;
    fly.from = copyPose(poseNow.current);
    fly.to = copyPose(POSES[next]);
    fly.start = performance.now();
    fly.duration = fly.reduced ? 1 : FLY_MS;
    fly.active = true;
    fly.target = next;
    setFlying(true);
  }, []);

  const onMid = useCallback((s: 0 | 1) => {
    setScreen(s);
    if (!flyRef.current.active) setFlying(false);
  }, []);

  useEffect(() => {
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
    const onTouchMove = (e: TouchEvent) => e.preventDefault();
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

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [goTo]);

  return (
    <div className={`stage${flying ? " is-flying" : ""}`} role="application" aria-label="Сергей Фомичёв. Скролл меняет сцену.">
      {mounted ? (
        <Canvas
          className="stage-canvas"
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: false }}
          shadows
          camera={{ fov: 40, near: 0.1, far: 60, position: [POSES[0].x, POSES[0].y, POSES[0].z] }}
        >
          <ComicWorld flyRef={flyRef} poseRef={poseNow} onMid={onMid} />
        </Canvas>
      ) : (
        <div className="stage-fallback" />
      )}

      <div className="vignette" />

      <div className="overlay">
        <header className="brand">
          <p className="brand-name">Сергей Фомичёв</p>
          <p className="brand-role">директор по развитию</p>
        </header>

        <span className="mark tabular-nums">{screen === 0 ? "01 / 02" : "02 / 02"}</span>

        <div className="copy-slot">
          <div className={`copy ${screen === 0 ? "is-here" : "is-away"}`}>
            <p className="kicker">директор по развитию</p>
            <h1 className="title">
              Решу ключевую
              <br />
              <em>боль</em> бизнеса
            </h1>
            <p className="lede">
              Компании 10–50 человек. Разбираю, где теряются заявки и деньги, потом чиню руками:
              люди, процессы, продажи, автоматизация.
            </p>
            <div className="actions">
              <a className="btn-lime hit" href={TG} target="_blank" rel="noreferrer">
                Написать в Telegram
                <ArrowUpRight className="size-4" strokeWidth={2.2} />
              </a>
            </div>
            <p className="fine">отвечаю сам · 20 минут · без презентаций и давления</p>
          </div>

          <div className={`copy ${screen === 1 ? "is-here" : "is-away"}`}>
            <p className="kicker">почему сейчас</p>
            <h1 className="title title-tight">
              Почему это горит
              <br />
              именно сейчас
            </h1>
            <p className="lede">
              Раньше ошибки в управлении закрывал общий рост рынка. Сейчас закрывать их нечем,
              и каждая дыра в процессах оплачивается из твоего кармана.
            </p>
            <ul className="burns">
              <li>
                <span>деньги подорожали</span>
              </li>
              <li>
                <span>реклама дорожает</span>
              </li>
              <li>
                <span>люди подорожали</span>
              </li>
              <li>
                <span>ИИ пересобирает рутину</span>
              </li>
            </ul>
            <div className="actions">
              <a className="btn-lime hit" href={TG} target="_blank" rel="noreferrer">
                Начать с диагностики
                <ArrowUpRight className="size-4" strokeWidth={2.2} />
              </a>
            </div>
            <p className="fine">первый разговор бесплатный, 20 минут</p>
          </div>
        </div>

        <img
          className={`portrait ${screen === 0 ? "is-here" : "is-away"}`}
          src="/portrait.jpg"
          alt="Сергей Фомичёв"
          width={700}
          height={820}
        />

        <footer className="dock">
          <div className="stats" hidden={screen !== 0}>
            <div>
              <b>5 лет</b>
              <span>в операционке малого бизнеса</span>
            </div>
            <div>
              <b>10–50</b>
              <span>человек, размер компаний</span>
            </div>
            <div>
              <b>×6,6</b>
              <span>выручки за квартал, кейс</span>
            </div>
            <div>
              <b>20 мин</b>
              <span>первый разговор, бесплатно</span>
            </div>
          </div>
          <div className="hint" aria-hidden="true">
            {screen === 0 ? (
              <>
                <span>{flying ? "полёт" : "скролл вниз"}</span>
                <ChevronDown className="hint-icon size-5 text-lime" strokeWidth={1.75} />
              </>
            ) : (
              <>
                <ChevronUp className="hint-icon size-5 text-lime" strokeWidth={1.75} />
                <span>{flying ? "полёт" : "скролл вверх"}</span>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
