import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";

const TG = "https://t.me/Thukydides";
const NOISE = 160;
const WHEEL_SPAN = 520;
const FOLLOW = 0.22;
const SNAP_MS = 340;
const IDLE_MS = 140;

function makeNoise(size: number) {
  const raw = new Float32Array(size * size);
  for (let i = 0; i < raw.length; i++) raw[i] = Math.random();
  const tmp = new Float32Array(raw.length);
  const blur = (src: Float32Array, dst: Float32Array) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let s = 0;
        let n = 0;
        for (let oy = -2; oy <= 2; oy++) {
          for (let ox = -2; ox <= 2; ox++) {
            const xx = Math.min(size - 1, Math.max(0, x + ox));
            const yy = Math.min(size - 1, Math.max(0, y + oy));
            s += src[yy * size + xx];
            n++;
          }
        }
        dst[y * size + x] = s / n;
      }
    }
  };
  blur(raw, tmp);
  blur(tmp, raw);
  let min = 1;
  let max = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] < min) min = raw[i];
    if (raw[i] > max) max = raw[i];
  }
  const span = max - min || 1;
  for (let i = 0; i < raw.length; i++) raw[i] = (raw[i] - min) / span;
  return raw;
}

const NOISE_DATA = makeNoise(NOISE);

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function DissolveStage() {
  const acidRef = useRef<HTMLDivElement>(null);
  const groupARef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const maskBuf = useRef<HTMLCanvasElement | null>(null);
  const acidBuf = useRef<HTMLCanvasElement | null>(null);
  const progress = useRef(0);
  const target = useRef(0);
  const snapping = useRef<{ from: number; to: number; start: number } | null>(null);
  const idleTimer = useRef(0);
  const lastPaint = useRef(-1);
  const touchY = useRef<number | null>(null);
  const touchP = useRef(0);
  const [screen, setScreen] = useState<0 | 1>(0);
  const [busy, setBusy] = useState(false);

  const paint = useCallback((p: number) => {
    if (Math.abs(p - lastPaint.current) < 0.002) return;
    lastPaint.current = p;
    const group = groupARef.current;
    const layer = acidRef.current;
    if (!group || !layer) return;
    if (!maskBuf.current) maskBuf.current = document.createElement("canvas");
    if (!acidBuf.current) acidBuf.current = document.createElement("canvas");
    const mask = maskBuf.current;
    const acid = acidBuf.current;
    if (mask.width !== NOISE) {
      mask.width = NOISE;
      mask.height = NOISE;
      acid.width = NOISE;
      acid.height = NOISE;
    }
    const mctx = mask.getContext("2d");
    const actx = acid.getContext("2d");
    if (!mctx || !actx) return;

    const mImg = mctx.createImageData(NOISE, NOISE);
    const aImg = actx.createImageData(NOISE, NOISE);
    const md = mImg.data;
    const ad = aImg.data;
    const w = 0.07;
    const rest = p <= 0.012 || p >= 0.988;
    const radius = p * 1.18;
    const inv = 1 / (NOISE - 1);
    const corner = Math.SQRT2 / 2;

    for (let y = 0; y < NOISE; y++) {
      const ny = y * inv - 0.5;
      for (let x = 0; x < NOISE; x++) {
        const i = y * NOISE + x;
        const n = NOISE_DATA[i];
        const o = i * 4;
        const nx = x * inv - 0.5;
        const dist = Math.sqrt(nx * nx + ny * ny) / corner;
        const field = dist + (n - 0.5) * 0.16 - radius;
        const keep = rest ? (p < 0.5 ? 1 : 0) : clamp01(field / w + 0.5);
        const a = Math.round(keep * 255);
        md[o] = 255;
        md[o + 1] = 255;
        md[o + 2] = 255;
        md[o + 3] = a;
        const edge = rest ? 0 : Math.max(0, 1 - Math.abs(field) / w);
        ad[o] = 212;
        ad[o + 1] = 255;
        ad[o + 2] = 63;
        ad[o + 3] = Math.round(Math.pow(edge, 1.25) * 240);
      }
    }
    mctx.putImageData(mImg, 0, 0);
    actx.putImageData(aImg, 0, 0);

    if (rest) {
      group.style.webkitMaskImage = "none";
      group.style.maskImage = "none";
      group.style.opacity = p < 0.5 ? "1" : "0";
      layer.style.backgroundImage = "none";
    } else {
      const url = `url(${mask.toDataURL("image/png")})`;
      group.style.webkitMaskImage = url;
      group.style.maskImage = url;
      group.style.webkitMaskSize = "100% 100%";
      group.style.maskSize = "100% 100%";
      group.style.opacity = "1";
      layer.style.backgroundImage = `url(${acid.toDataURL("image/png")})`;
    }
    group.style.pointerEvents = p > 0.5 ? "none" : "auto";
    stageRef.current?.style.setProperty("--p", String(p));
  }, []);

  const setTarget = useCallback(
    (v: number, snapNow = false) => {
      const next = clamp01(v);
      target.current = next;
      snapping.current = null;
      window.clearTimeout(idleTimer.current);
      setBusy(true);
      if (snapNow) {
        snapping.current = { from: progress.current, to: next, start: performance.now() };
      } else {
        idleTimer.current = window.setTimeout(() => {
          const goal = target.current >= 0.45 ? 1 : 0;
          target.current = goal;
          snapping.current = { from: progress.current, to: goal, start: performance.now() };
        }, IDLE_MS);
      }
    },
    [],
  );

  useEffect(() => {
    paint(0);
    let raf = 0;
    const tick = (now: number) => {
      const snap = snapping.current;
      if (snap) {
        const t = clamp01((now - snap.start) / SNAP_MS);
        const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        progress.current = snap.from + (snap.to - snap.from) * k;
        if (t >= 1) {
          progress.current = snap.to;
          snapping.current = null;
          setBusy(false);
        }
      } else {
        const d = target.current - progress.current;
        if (Math.abs(d) > 0.001) progress.current += d * FOLLOW;
        else progress.current = target.current;
      }
      paint(progress.current);
      const shown: 0 | 1 = progress.current >= 0.5 ? 1 : 0;
      setScreen((prev) => (prev === shown ? prev : shown));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 1) return;
      setTarget(target.current + e.deltaY / WHEEL_SPAN);
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "Spacebar"].includes(e.key)) {
        e.preventDefault();
        setTarget(1, true);
      }
      if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        setTarget(0, true);
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY.current = e.touches[0]?.clientY ?? null;
      touchP.current = target.current;
      snapping.current = null;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const start = touchY.current;
      const y = e.touches[0]?.clientY;
      if (start == null || y == null) return;
      setTarget(touchP.current + (start - y) / (window.innerHeight * 0.7));
    };
    const onTouchEnd = () => {
      touchY.current = null;
      setTarget(target.current);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idleTimer.current);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [paint, setTarget]);

  return (
    <div
      ref={stageRef}
      className="stage"
      role="application"
      aria-label="Два экрана. Скролл проявляет следующий сквозь текущий."
    >
      <div className="stack">
        <article className={`screen screen-b${screen === 0 ? " is-idle" : ""}`} aria-hidden={screen === 0}>
          <header className="brand">
            <p className="brand-name">Сергей Фомичёв</p>
            <p className="brand-role">директор по развитию</p>
          </header>
          <div className="screen-body">
            <p className="kicker">почему сейчас</p>
            <h1 className="title title-tight">
              Почему это горит
              <br />
              именно сейчас
            </h1>
            <p className="lede">
              Раньше ошибки в управлении закрывал общий рост рынка. Сейчас закрывать их нечем, и
              каждая дыра в процессах оплачивается из твоего кармана.
            </p>
            <ul className="burns">
              <li>деньги подорожали</li>
              <li>реклама дорожает</li>
              <li>люди подорожали</li>
              <li>ИИ пересобирает рутину</li>
            </ul>
            <div className="actions">
              <a className="btn-lime" href={TG} target="_blank" rel="noreferrer">
                Начать с диагностики
                <ArrowUpRight className="size-4" strokeWidth={2.2} />
              </a>
            </div>
            <p className="fine">первый разговор бесплатный, 20 минут</p>
          </div>
        </article>

        <div ref={groupARef} className="group-a">
          <article className="screen screen-a" aria-hidden={screen === 1}>
            <header className="brand">
              <p className="brand-name">Сергей Фомичёв</p>
              <p className="brand-role">директор по развитию</p>
            </header>
            <div className="screen-body">
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
                <a className="btn-lime" href={TG} target="_blank" rel="noreferrer">
                  Написать в Telegram
                  <ArrowUpRight className="size-4" strokeWidth={2.2} />
                </a>
              </div>
              <p className="fine">отвечаю сам · 20 минут · без презентаций и давления</p>
            </div>
            <img
              className="portrait is-here"
              src="/portrait.jpg"
              alt="Сергей Фомичёв"
              width={700}
              height={820}
            />
            <div className="stats">
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
          </article>
        </div>

        <div ref={acidRef} className="acid-edge" aria-hidden="true" />
      </div>

      <span className="mark tabular-nums">{screen === 0 ? "01 / 02" : "02 / 02"}</span>

      <div className="hint" aria-hidden="true">
        {screen === 0 ? (
          <>
            <span>{busy ? "проявление" : "скролл вниз"}</span>
            <ChevronDown className="hint-icon size-5 text-lime" strokeWidth={1.75} />
          </>
        ) : (
          <>
            <ChevronUp className="hint-icon size-5 text-lime" strokeWidth={1.75} />
            <span>{busy ? "проявление" : "скролл вверх"}</span>
          </>
        )}
      </div>
    </div>
  );
}
