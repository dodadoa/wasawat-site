import { useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";
import { useGame, type Role } from "./store";
import { startAmbient } from "./audio";
import { world, you } from "./world";
import { PLAYER_START, FLOOR_LABEL, floorAt, exitsFrom } from "./level";
import { addVisitorMemory, allMemories, memoryBus } from "./memory";
import { WebcamView, useWebcamKeys, webcamHint } from "./WebcamView";
import { guestFeeling, guestNotes } from "./guest";
import { FRAGMENTS, STAIRS_AT, fill, story } from "./story";

function resetWorld() {
  world.player.pos.set(PLAYER_START.x, 0, PLAYER_START.z);
  world.player.yaw = PLAYER_START.yaw;
  world.locked = false;
  world.zone = "";
}

function Typewriter({ text, speed = 28 }: { text: string; speed?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 1000 / speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span>{text.slice(0, n)}</span>;
}

/** The subtitles: one place, the whole line at once, held long enough to read. */
function Whisper() {
  const whisper = useGame((s) => s.whisper);
  // the line index belongs to one whisper; a new whisper starts at 0
  const [pos, setPos] = useState({ key: 0, i: 0 });
  const i = whisper && pos.key === whisper.key ? pos.i : 0;
  useEffect(() => {
    if (!whisper) return;
    const line = whisper.lines[i];
    if (line === undefined) {
      useGame.getState().clearWhisper();
      return;
    }
    const hold = window.setTimeout(() => setPos({ key: whisper.key, i: i + 1 }), 1800 + line.length * 55);
    return () => clearTimeout(hold);
  }, [whisper, i]);
  const line = whisper?.lines[i];
  if (!line) return null;
  return (
    <div className={`whisper ${whisper.who}`} key={`${whisper.key}-${i}`}>
      <span>{line}</span>
    </div>
  );
}

/**
 * When the player walks out of a fixed camera's frame, an arrow on the screen
 * edge points to where they went. Driven from world.offscreen every frame
 * without React re-renders.
 */
function OffscreenHint() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const el = ref.current;
      const o = world.offscreen;
      if (el) {
        if (!o) el.style.opacity = "0";
        else {
          // push the point onto an inset rectangle along its direction from the centre
          const k = 1 / Math.max(Math.abs(o.x) / 0.9, Math.abs(o.y) / 0.84, 1e-6);
          const x = o.x * k, y = o.y * k;
          el.style.opacity = "1";
          el.style.left = `${(x * 0.5 + 0.5) * 100}%`;
          el.style.top = `${(-y * 0.5 + 0.5) * 100}%`;
          el.style.setProperty("--angle", `${Math.atan2(-y, x)}rad`);
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div ref={ref} className="offscreen-hint" aria-hidden>
      <span className="arrow" />
      <span className="label">YOU</span>
    </div>
  );
}

const proj = new THREE.Vector3();
/** World point to normalised screen space (-1..1, y up), unmirrored when behind the camera. */
function toScreen(x: number, y: number, z: number) {
  proj.set(x, y, z).project(world.camera!);
  return proj.z > 1 ? { x: -proj.x, y: -proj.y, behind: true } : { x: proj.x, y: proj.y, behind: false };
}

/**
 * Small marks where the current camera's frame leads on: a chevron at each
 * edge into the next camera zone, a stair/door mark at each door. Off frame,
 * they cling to the screen edge. The chevron points from the keeper towards it.
 */
function ExitHints() {
  const cameraId = useGame((s) => s.cameraId);
  const busy = useGame((s) => !!s.message || s.writing);
  const exits = useMemo(() => exitsFrom(cameraId), [cameraId]);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      if (world.camera) {
        const p = you().pos;
        const me = toScreen(p.x, 0.3, p.z);
        exits.forEach((e, i) => {
          const el = refs.current[i];
          if (!el) return;
          const s = toScreen(e.x, e.door ? 1.1 : 0.3, e.z);
          // keep it inside an inset rectangle along its direction from the centre
          let k = 1 / Math.max(Math.abs(s.x) / 0.92, Math.abs(s.y) / 0.86, 1e-6);
          if (!s.behind) k = Math.min(1, k);
          const x = s.x * k, y = s.y * k;
          el.style.left = `${(x * 0.5 + 0.5) * 100}%`;
          el.style.top = `${(-y * 0.5 + 0.5) * 100}%`;
          const aspect = innerWidth / innerHeight;
          el.style.setProperty("--angle", `${Math.atan2(-(y - me.y), (x - me.x) * aspect)}rad`);
          // fade out once the keeper is standing on it
          const near = Math.hypot(p.x - e.x, p.z - e.z) < 0.9;
          el.style.opacity = near ? "0" : "";
        });
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [exits]);
  if (busy) return null;
  return (
    <>
      {exits.map((e, i) => (
        <div key={`${cameraId}-${i}`} ref={(el) => void (refs.current[i] = el)} className={`exit-hint ${e.door ? "door" : ""}`} aria-hidden>
          {e.door ? (
            <svg viewBox="0 0 16 16" width="16" height="16">
              {e.door.exit ? (
                <path d="M3 15V2h8v13M11 8.5h-1" fill="none" stroke="currentColor" strokeWidth="1.5" />
              ) : (
                <path d="M1 14h4v-4h4V6h4V2h2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              )}
            </svg>
          ) : (
            <span className="chev" />
          )}
        </div>
      ))}
    </>
  );
}

/** The "leave a memory" box, opened from the coasters on the bar. */
function MemoryInput() {
  const [text, setText] = useState("");
  const close = () => {
    setText("");
    useGame.getState().setWriting(false);
  };
  const submit = () => {
    const t = text.trim();
    if (!t) return close();
    const p = world.player.pos;
    // the ghost takes it in, and tells it back to you before long
    memoryBus.pending = addVisitorMemory(t, floorAt(p.x), p.x, p.z);
    close();
    useGame.getState().say(["You leave the coaster face down on the bar.", "Behind the bottles, something breathes in. It will hold on to this longer than you will."]);
  };
  return (
    <div className="memory-input">
      <label>Write something that happened here.</label>
      <input
        autoFocus
        maxLength={140}
        value={text}
        placeholder="the night we…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") close();
        }}
      />
      <small>ENTER leave it · ESC put the pen down</small>
    </div>
  );
}

/** M in ghost mode: what has come back to the guest, which of it is yours, and what it makes of it. */
function GuestNotebook() {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((v) => v + 1), 500);
    return () => clearInterval(id);
  }, []);
  const notes = guestNotes();
  return (
    <div className="memory-panel notebook">
      <h3>
        WHAT HAS COME BACK TO IT
        <span className="voice">{story.found.length} / {Object.keys(FRAGMENTS).length}</span>
      </h3>
      <p className="empty">{guestFeeling()}{story.act === "case" && story.found.length < STAIRS_AT ? " It isn't ready to go up." : ""}</p>
      {[...story.found].reverse().map((id) => (
        <p key={id} className={`memory ${FRAGMENTS[id].kind}`}>{fill(FRAGMENTS[id].lines.join(" "))}</p>
      ))}
      {notes.length ? [...notes].reverse().slice(0, 2).map((n, i) => <p key={notes.length - i}>{n}</p>) : <p className="empty">Nothing yet. It has only just woken.</p>}
    </div>
  );
}

/** M: what the ghost still remembers, and how strongly. */
function MemoryPanel() {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((v) => v + 1), 500);
    return () => clearInterval(id);
  }, []);
  const list = [...allMemories()].sort((a, b) => b.strength - a.strength);
  return (
    <div className="memory-panel">
      <h3>
        WHAT IT STILL REMEMBERS
      </h3>
      {list.map((m) => (
        <div key={m.id} className={`mem ${m.visitor ? "visitor" : ""}`}>
          <span className="bar">
            <i style={{ width: `${Math.round(m.strength * 100)}%` }} />
          </span>
          <span className="floor">{FLOOR_LABEL[m.floor]}</span>
          <span className="era">{m.visitor ? "visitor" : m.era && m.era !== "always" ? m.era : ""}</span>
          <span className="text">{m.lines[0]}</span>
        </div>
      ))}
    </div>
  );
}

/** C in the game: who made it. Names and handles keep their own spelling. */
function Credits() {
  return (
    <div className="credits">
      <p>For Sala Saneha (<a href="https://www.instagram.com/sala.saneha/" target="_blank" rel="noreferrer">@sala.saneha</a>)</p>
      <h3>assistant and project manager</h3>
      <p>Pon Der (<a href="https://www.instagram.com/poncrastination/" target="_blank" rel="noreferrer">@poncrastination</a> on IG)</p>
      <h3>special thanks</h3>
      <p>Sutiphong Sudsang</p>
      <p>Pakapol Srirongmuang</p>
      <p>Natchanon Vana</p>
      <button className="link close" onClick={() => useGame.getState().setCredits(false)}>close</button>
    </div>
  );
}

/** H: every control for the role you're in. */
function Help({ role, controls, webcam, pad }: { role: Role; controls: string; webcam: boolean; pad: boolean }) {
  const walk = controls === "modern" ? "move" : "up/down walk, left/right turn";
  const rows: [string, string][] =
    role === "camera"
      ? [["ARROWS", "float and turn"], ["DRAG", "look"], ["SHIFT", "faster"], ["Q", "turn round"], ["ENTER", "stairs, stir the lamps to lead it"], ["M", "its memories"], ["G", "walk again"]]
      : role === "figure"
        ? [["ARROWS", walk], ["SHIFT", "run"], ["ENTER", "stairs, stir the lamps to lead it"], ["M", "its memories"], ["TAB", `${controls === "modern" ? "classic" : "modern"} controls`], ["G", "ghost camera"]]
        : [["ARROWS", walk], ["SHIFT", "run"], ["ENTER", "examine"], ["M", "memories"], ["TAB", `${controls === "modern" ? "classic" : "modern"} controls`], ["G", "ghost figure"]];
  return (
    <div className="help">
      <h3>CONTROLS</h3>
      {rows.map(([k, v]) => (
        <p key={k}><kbd>{k}</kbd>{v}</p>
      ))}
      <p><kbd>K</kbd>webcam</p>
      <p><kbd>C</kbd>credits</p>
      {role !== "keeper" && <p className="note">Linger close and it feels the cold.</p>}
      {webcam && role !== "keeper" && <p className="note">Hand: point, beckon, wave, touch it, close your fist on it.</p>}
      {pad && <p className="note">Pad: A enter, B run, X turn round, Y memories, START role, SELECT controls, L1 webcam.</p>}
    </div>
  );
}

export function UI() {
  const phase = useGame((s) => s.phase);
  const controls = useGame((s) => s.controls);
  const message = useGame((s) => s.message);
  const prompt = useGame((s) => s.prompt);
  const fade = useGame((s) => s.fade);
  const writing = useGame((s) => s.writing);
  const intro = useGame((s) => s.intro);
  const credits = useGame((s) => s.credits);
  const showMemories = useGame((s) => s.showMemories);
  const webcam = useGame((s) => s.webcam);
  const webcamView = useGame((s) => s.webcamView);
  const role = useGame((s) => s.role);
  const { active, progress } = useProgress();
  const [pad, setPad] = useState(false);
  const [help, setHelp] = useState(false);
  useWebcamKeys();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      const s = useGame.getState();
      if (e.code === "Escape" && s.credits) s.setCredits(false);
      if (typing) return;
      if (e.code === "KeyH") setHelp((v) => !v);
      if (e.code === "KeyC" && s.phase === "playing") s.setCredits(!s.credits);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const on = () => setPad(true);
    const off = () => setPad(false);
    window.addEventListener("gamepadconnected", on);
    window.addEventListener("gamepaddisconnected", off);
    return () => {
      window.removeEventListener("gamepadconnected", on);
      window.removeEventListener("gamepaddisconnected", off);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Enter" && e.code !== "Space") return;
      const s = useGame.getState();
      if (s.phase === "title" && !active) {
        startAmbient();
        resetWorld();
        s.start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <div className="overlay">
      {phase === "playing" && (
        <>
          <div className="hint">
            {role === "keeper" ? "THE KEEPER" : role === "camera" ? "THE GHOST CAMERA" : "THE GHOST"}
            <span> · M MEMORIES · H CONTROLS · </span>
            <button className="link" onClick={(e) => { e.currentTarget.blur(); useGame.getState().setCredits(true); }}>credits</button>
            {webcam !== "off" && <div>{webcamHint(webcam)}</div>}
          </div>
          {help && <Help role={role} controls={controls} webcam={webcam === "on"} pad={pad} />}
          {webcam === "on" && webcamView && <WebcamView />}
          {showMemories && (role === "keeper" ? <MemoryPanel /> : <GuestNotebook />)}
          {role !== "camera" && <ExitHints />}
          <OffscreenHint />
          <Whisper />
          {prompt && !message && !writing && <div className="prompt">{prompt}</div>}
          <div className={`intro-black ${intro ? "on" : ""}`} />
          {message && (
            <div className={`msgbox ${intro ? "card" : ""}`}>
              <Typewriter text={message.lines[message.index]} />
              <span className="next">▼</span>
            </div>
          )}
          {writing && <MemoryInput />}
        </>
      )}
      <div className="fade" style={{ opacity: phase === "playing" ? fade : 0, pointerEvents: "none" }} />
      {phase === "title" && (
        <div
          className="title"
          onClick={() => {
            if (active) return;
            startAmbient();
            resetWorld();
            useGame.getState().start();
          }}
        >
          <h1>Ghost of AI</h1>
          <p className="place">SALA SANEHA, BANGKOK</p>
          <div className="press">{active ? `LOADING ${Math.round(progress)}%` : pad ? "PRESS A" : "PRESS ENTER"}</div>
        </div>
      )}
      {phase === "playing" && credits && <Credits />}
    </div>
  );
}
