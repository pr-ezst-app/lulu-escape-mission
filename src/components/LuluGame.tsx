import { useEffect, useRef, useState, useCallback } from "react";

type GameScreen = "menu" | "settings" | "playing" | "gameover" | "leaderboard";
type Difficulty = "easy" | "medium" | "hard";

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "cactus" | "spike" | "barrel";
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  speed: number;
}

interface ScoreEntry {
  name: string;
  score: number;
  level: number;
  date: string;
}

const CANVAS_W = 800;
const CANVAS_H = 400;
const GROUND_Y = 300;
const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const LULU_W = 32;
const LULU_H = 40;

const DIFFICULTY_CONFIG = {
  easy: { speed: 4, obstacleInterval: 120, platformCount: 5, label: "EASY" },
  medium: { speed: 6, obstacleInterval: 80, platformCount: 4, label: "MEDIUM" },
  hard: { speed: 9, obstacleInterval: 55, platformCount: 3, label: "HARD" },
};

const PALETTE = {
  sky: "#0a0a2e",
  skyMid: "#1a1a4e",
  ground: "#2d1b00",
  groundTop: "#4a2800",
  grass: "#1a7a1a",
  luluBody: "#2ecc40",
  luluDark: "#1a8a1a",
  luluEye: "#ffffff",
  luluPupil: "#000000",
  vixBody: "#2ecc40",
  vixHair: "#ff69b4",
  vixCrown: "#ffd700",
  rock: "#888888",
  rockDark: "#555555",
  rockLight: "#aaaaaa",
  obstacle: "#cc3333",
  obstacleDark: "#882222",
  coin: "#ffd700",
  coinDark: "#cc9900",
  pixel1: "#ff6b6b",
  pixel2: "#4ecdc4",
  pixel3: "#ffe66d",
  ui: "#ffffff",
  uiDim: "#aaaaaa",
  uiAccent: "#ffd700",
  uiBg: "rgba(0,0,0,0.85)",
  uiBorder: "#ffd700",
};

function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

function drawLulu(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  jumping: boolean
) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const legOff = jumping ? 0 : frame % 2 === 0 ? 2 : -2;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(px - 4, py + LULU_H - 2, LULU_W + 8, 4);

  // Body
  drawPixelRect(ctx, px + 4, py + 10, 24, 22, PALETTE.luluBody);
  // Body shading
  drawPixelRect(ctx, px + 4, py + 10, 4, 22, PALETTE.luluDark);
  drawPixelRect(ctx, px + 24, py + 10, 4, 22, PALETTE.luluDark);

  // Head
  drawPixelRect(ctx, px + 6, py, 20, 14, PALETTE.luluBody);
  drawPixelRect(ctx, px + 6, py, 4, 14, PALETTE.luluDark);

  // Eyes
  drawPixelRect(ctx, px + 18, py + 4, 5, 5, PALETTE.luluEye);
  drawPixelRect(ctx, px + 20, py + 5, 3, 3, PALETTE.luluPupil);
  drawPixelRect(ctx, px + 10, py + 4, 5, 5, PALETTE.luluEye);
  drawPixelRect(ctx, px + 11, py + 5, 3, 3, PALETTE.luluPupil);

  // Mouth smile
  drawPixelRect(ctx, px + 12, py + 10, 2, 2, PALETTE.luluDark);
  drawPixelRect(ctx, px + 18, py + 10, 2, 2, PALETTE.luluDark);
  drawPixelRect(ctx, px + 14, py + 12, 4, 2, PALETTE.luluDark);

  // Shirt stripe
  drawPixelRect(ctx, px + 4, py + 18, 24, 4, PALETTE.luluDark);

  // Arms
  const armSwing = jumping ? -4 : frame % 2 === 0 ? 3 : -3;
  drawPixelRect(ctx, px, py + 12 + armSwing, 6, 12, PALETTE.luluBody);
  drawPixelRect(ctx, px + 26, py + 12 - armSwing, 6, 12, PALETTE.luluBody);

  // Legs
  drawPixelRect(ctx, px + 6, py + 30, 10, 10 + legOff, PALETTE.luluDark);
  drawPixelRect(ctx, px + 16, py + 30, 10, 10 - legOff, PALETTE.luluDark);

  // Shoes
  drawPixelRect(ctx, px + 4, py + 36 + legOff, 14, 6, "#333333");
  drawPixelRect(ctx, px + 14, py + 36 - legOff, 14, 6, "#333333");
}

function drawPrincessVix(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const px = Math.floor(x);
  const py = Math.floor(y);

  // Dress
  ctx.fillStyle = "#cc44cc";
  ctx.fillRect(px, py + 20, 40, 30);
  ctx.fillStyle = "#aa22aa";
  ctx.fillRect(px, py + 20, 8, 30);
  ctx.fillRect(px + 32, py + 20, 8, 30);

  // Body
  drawPixelRect(ctx, px + 10, py + 10, 20, 14, PALETTE.vixBody);
  drawPixelRect(ctx, px + 10, py + 10, 4, 14, PALETTE.luluDark);

  // Head
  drawPixelRect(ctx, px + 8, py - 2, 24, 16, PALETTE.vixBody);
  drawPixelRect(ctx, px + 8, py - 2, 4, 16, PALETTE.luluDark);

  // Crown
  ctx.fillStyle = PALETTE.vixCrown;
  ctx.fillRect(px + 8, py - 10, 4, 10);
  ctx.fillRect(px + 16, py - 14, 4, 14);
  ctx.fillRect(px + 24, py - 10, 4, 10);
  ctx.fillRect(px + 8, py - 2, 24, 4);

  // Crown gem
  ctx.fillStyle = "#ff3333";
  ctx.fillRect(px + 17, py - 13, 2, 2);

  // Hair
  ctx.fillStyle = PALETTE.vixHair;
  ctx.fillRect(px + 6, py - 2, 6, 20);
  ctx.fillRect(px + 28, py - 2, 6, 20);
  ctx.fillRect(px + 8, py - 4, 24, 4);

  // Eyes
  drawPixelRect(ctx, px + 22, py + 3, 5, 5, PALETTE.luluEye);
  drawPixelRect(ctx, px + 23, py + 4, 3, 3, PALETTE.luluPupil);
  drawPixelRect(ctx, px + 13, py + 3, 5, 5, PALETTE.luluEye);
  drawPixelRect(ctx, px + 14, py + 4, 3, 3, PALETTE.luluPupil);

  // Lips
  ctx.fillStyle = "#ff6699";
  ctx.fillRect(px + 15, py + 11, 10, 3);

  // Wand
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(px + 38, py - 20, 4, 40);
  ctx.fillStyle = "#ffaaff";
  ctx.fillRect(px + 34, py - 26, 12, 12);
  ctx.fillStyle = "#ff66ff";
  ctx.fillRect(px + 36, py - 24, 8, 8);
}

function drawRock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  // Main rock body
  drawPixelRect(ctx, x + 4, y, w - 8, h, PALETTE.rock);
  drawPixelRect(ctx, x, y + 4, w, h - 8, PALETTE.rock);

  // Dark side
  drawPixelRect(ctx, x, y + 4, 6, h - 8, PALETTE.rockDark);
  drawPixelRect(ctx, x + 4, y + h - 6, w - 8, 6, PALETTE.rockDark);

  // Light side
  drawPixelRect(ctx, x + w - 6, y + 4, 6, h - 8, PALETTE.rockLight);
  drawPixelRect(ctx, x + 4, y, w - 8, 6, PALETTE.rockLight);

  // Pixel details
  ctx.fillStyle = PALETTE.rockDark;
  ctx.fillRect(x + 8, y + 8, 4, 4);
  ctx.fillRect(x + w - 16, y + 6, 4, 4);
  ctx.fillRect(x + 12, y + h - 14, 6, 4);
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle
) {
  const { x, y, width, height, type } = obs;
  if (type === "cactus") {
    // Cactus body
    drawPixelRect(ctx, x + width / 2 - 6, y, 12, height, "#2d8a2d");
    drawPixelRect(ctx, x + width / 2 - 4, y, 8, height, "#3aaa3a");
    // Arms
    drawPixelRect(ctx, x, y + height * 0.4, width / 2 - 2, 10, "#2d8a2d");
    drawPixelRect(ctx, x + width / 2 + 2, y + height * 0.6, width / 2 - 2, 10, "#2d8a2d");
    // Spines
    ctx.fillStyle = "#1a6a1a";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + width / 2 - 8, y + i * 12 + 4, 4, 3);
      ctx.fillRect(x + width / 2 + 5, y + i * 12 + 8, 4, 3);
    }
  } else if (type === "spike") {
    ctx.fillStyle = PALETTE.obstacle;
    for (let i = 0; i < Math.floor(width / 16); i++) {
      const sx = x + i * 16;
      ctx.beginPath();
      ctx.moveTo(sx, y + height);
      ctx.lineTo(sx + 8, y);
      ctx.lineTo(sx + 16, y + height);
      ctx.fill();
      ctx.fillStyle = PALETTE.obstacleDark;
      ctx.beginPath();
      ctx.moveTo(sx + 8, y);
      ctx.lineTo(sx + 16, y + height);
      ctx.lineTo(sx + 8, y + height);
      ctx.fill();
      ctx.fillStyle = PALETTE.obstacle;
    }
  } else {
    // Barrel
    drawPixelRect(ctx, x + 4, y, width - 8, height, "#8B4513");
    drawPixelRect(ctx, x, y + 8, width, height - 16, "#8B4513");
    drawPixelRect(ctx, x + 4, y + 4, width - 8, 4, "#cd853f");
    drawPixelRect(ctx, x + 4, y + height - 8, width - 8, 4, "#cd853f");
    drawPixelRect(ctx, x + 4, y + height / 2 - 2, width - 8, 4, "#cd853f");
    ctx.fillStyle = "#5a2d00";
    ctx.fillRect(x + 2, y + 8, 4, height - 16);
    ctx.fillRect(x + width - 6, y + 8, 4, height - 16);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, offset: number) {
  // Ground base
  drawPixelRect(ctx, 0, GROUND_Y + LULU_H, CANVAS_W, CANVAS_H - GROUND_Y - LULU_H, PALETTE.ground);
  drawPixelRect(ctx, 0, GROUND_Y + LULU_H, CANVAS_W, 8, PALETTE.groundTop);

  // Grass tufts
  ctx.fillStyle = PALETTE.grass;
  for (let i = 0; i < 20; i++) {
    const gx = ((i * 48 - offset * 0.5) % (CANVAS_W + 48) + CANVAS_W + 48) % (CANVAS_W + 48) - 16;
    ctx.fillRect(gx, GROUND_Y + LULU_H - 4, 6, 8);
    ctx.fillRect(gx + 8, GROUND_Y + LULU_H - 6, 4, 10);
    ctx.fillRect(gx + 16, GROUND_Y + LULU_H - 4, 6, 8);
  }

  // Pixel ground details
  ctx.fillStyle = "#3d2200";
  for (let i = 0; i < 30; i++) {
    const dx = ((i * 32 - offset * 0.3) % (CANVAS_W + 64) + CANVAS_W + 64) % (CANVAS_W + 64) - 16;
    ctx.fillRect(dx, GROUND_Y + LULU_H + 10, 8, 4);
  }
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  tick: number,
  clouds: Cloud[]
) {
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y + LULU_H);
  grad.addColorStop(0, PALETTE.sky);
  grad.addColorStop(0.6, PALETTE.skyMid);
  grad.addColorStop(1, "#2a1a00");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y + LULU_H);

  // Stars
  stars.forEach((s) => {
    const brightness =
      0.4 + 0.6 * Math.abs(Math.sin(tick * s.twinkleSpeed * 0.05));
    ctx.fillStyle = `rgba(255,255,255,${brightness})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  // Moon
  ctx.fillStyle = "#fffde7";
  ctx.beginPath();
  ctx.arc(700, 50, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.sky;
  ctx.beginPath();
  ctx.arc(712, 44, 24, 0, Math.PI * 2);
  ctx.fill();

  // Clouds
  clouds.forEach((c) => {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(c.x + i * (c.width / 3), c.y + (i === 1 ? -12 : 0), c.width / 2.5, 24);
    }
    ctx.fillRect(c.x, c.y, c.width, 16);
  });
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(
      Math.floor(p.x - p.size / 2),
      Math.floor(p.y - p.size / 2),
      p.size,
      p.size
    );
  });
  ctx.globalAlpha = 1;
}

function pixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "left"
) {
  ctx.font = `${size}px 'Press Start 2P'`;
  ctx.textAlign = align;
  ctx.fillStyle = "#000000";
  ctx.fillText(text, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

const initStars = (): Star[] =>
  Array.from({ length: 80 }, () => ({
    x: Math.random() * CANVAS_W,
    y: Math.random() * (GROUND_Y - 20),
    size: Math.random() < 0.3 ? 2 : 1,
    brightness: Math.random(),
    twinkleSpeed: 0.5 + Math.random() * 2,
  }));

const initClouds = (): Cloud[] =>
  Array.from({ length: 5 }, (_, i) => ({
    x: i * 180,
    y: 30 + Math.random() * 80,
    width: 80 + Math.random() * 60,
    speed: 0.3 + Math.random() * 0.3,
  }));

export default function LuluGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    screen: "menu" as GameScreen,
    playing: false,
    luluY: GROUND_Y,
    luluVY: 0,
    luluFrame: 0,
    luluOnGround: true,
    luluJumping: false,
    luluDoubleJump: false,
    obstacles: [] as Obstacle[],
    platforms: [] as Platform[],
    particles: [] as Particle[],
    stars: initStars(),
    clouds: initClouds(),
    score: 0,
    level: 1,
    tick: 0,
    offset: 0,
    gameSpeed: DIFFICULTY_CONFIG.easy.speed,
    obstacleTimer: 0,
    difficulty: "easy" as Difficulty,
    scores: [] as ScoreEntry[],
    flashTimer: 0,
    vixX: CANVAS_W + 100,
    vixIntro: false,
    luluX: 80,
    luluMoveTarget: 80,
    soundEnabled: true,
    musicVolume: 5,
    sfxVolume: 5,
  });

  const [screen, setScreen] = useState<GameScreen>("menu");
  const [finalScore, setFinalScore] = useState(0);
  const [finalLevel, setFinalLevel] = useState(1);
  const [playerName, setPlayerName] = useState("PLAYER");
  const [scores, setScores] = useState<ScoreEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("luluScores") || "[]");
    } catch {
      return [];
    }
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicVol, setMusicVol] = useState(5);
  const [sfxVol, setSfxVol] = useState(5);
  const rafRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const justPressedRef = useRef<Set<string>>(new Set());

  const spawnParticles = (x: number, y: number, color: string, count = 8) => {
    const gs = gameStateRef.current;
    for (let i = 0; i < count; i++) {
      gs.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: -(Math.random() * 5 + 2),
        life: 1,
        color,
        size: 4 + Math.floor(Math.random() * 4),
      });
    }
  };

  const spawnObstacle = useCallback(() => {
    const gs = gameStateRef.current;
    const cfg = DIFFICULTY_CONFIG[gs.difficulty];
    const types: Obstacle["type"][] = ["cactus", "spike", "barrel"];
    const type = types[Math.floor(Math.random() * types.length)];

    const onPlatform =
      gs.difficulty !== "easy" && gs.platforms.length > 0 && Math.random() < 0.25;

    let obsY = GROUND_Y;
    if (onPlatform) {
      const plat = gs.platforms[Math.floor(Math.random() * gs.platforms.length)];
      if (plat.x > CANVAS_W - 100) {
        obsY = plat.y - 26;
      }
    }

    gs.obstacles.push({
      x: CANVAS_W + 20,
      y: obsY,
      width: type === "spike" ? 48 : 32,
      height: type === "cactus" ? 48 : type === "spike" ? 26 : 38,
      type,
    });
  }, []);

  const spawnPlatforms = useCallback(() => {
    const gs = gameStateRef.current;
    const cfg = DIFFICULTY_CONFIG[gs.difficulty];
    gs.platforms = [];
    for (let i = 0; i < cfg.platformCount; i++) {
      gs.platforms.push({
        x: 200 + i * 160,
        y: GROUND_Y - 70 - Math.random() * 60,
        width: 80 + Math.random() * 40,
        height: 20,
      });
    }
  }, []);

  const startGame = useCallback(
    (diff: Difficulty) => {
      const gs = gameStateRef.current;
      gs.screen = "playing";
      gs.playing = true;
      gs.luluY = GROUND_Y;
      gs.luluVY = 0;
      gs.luluOnGround = true;
      gs.luluJumping = false;
      gs.luluDoubleJump = false;
      gs.luluFrame = 0;
      gs.obstacles = [];
      gs.particles = [];
      gs.score = 0;
      gs.level = 1;
      gs.tick = 0;
      gs.offset = 0;
      gs.difficulty = diff;
      gs.gameSpeed = DIFFICULTY_CONFIG[diff].speed;
      gs.obstacleTimer = 0;
      gs.flashTimer = 0;
      gs.vixIntro = true;
      gs.vixX = CANVAS_W + 100;
      spawnPlatforms();
      setScreen("playing");
    },
    [spawnPlatforms]
  );

  const endGame = useCallback(() => {
    const gs = gameStateRef.current;
    gs.playing = false;
    gs.screen = "gameover";
    const s = gs.score;
    const l = gs.level;
    setFinalScore(s);
    setFinalLevel(l);
    setScreen("gameover");
  }, []);

  const saveScore = useCallback(
    (name: string) => {
      const entry: ScoreEntry = {
        name: name.toUpperCase().slice(0, 8) || "ANON",
        score: finalScore,
        level: finalLevel,
        date: new Date().toLocaleDateString(),
      };
      const newScores = [...scores, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      setScores(newScores);
      localStorage.setItem("luluScores", JSON.stringify(newScores));
      gameStateRef.current.scores = newScores;
      setScreen("leaderboard");
      gameStateRef.current.screen = "leaderboard";
    },
    [scores, finalScore, finalLevel]
  );

  const jump = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs.playing) return;
    if (gs.luluOnGround) {
      gs.luluVY = JUMP_FORCE;
      gs.luluOnGround = false;
      gs.luluJumping = true;
      gs.luluDoubleJump = false;
      spawnParticles(gs.luluX + LULU_W / 2, gs.luluY + LULU_H, PALETTE.pixel3, 6);
    } else if (!gs.luluDoubleJump) {
      gs.luluVY = JUMP_FORCE * 0.85;
      gs.luluDoubleJump = true;
      spawnParticles(gs.luluX + LULU_W / 2, gs.luluY + LULU_H / 2, PALETTE.pixel2, 10);
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!keysRef.current.has(e.code)) {
        justPressedRef.current.add(e.code);
      }
      keysRef.current.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const loop = () => {
      const gs = gameStateRef.current;
      const jp = justPressedRef.current;

      if (
        gs.screen === "playing" &&
        gs.playing &&
        (jp.has("Space") || jp.has("ArrowUp") || jp.has("KeyW"))
      ) {
        jump();
      }
      justPressedRef.current.clear();

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      if (gs.screen === "playing" || gs.screen === "gameover") {
        gs.tick++;

        // Update clouds
        gs.clouds.forEach((c) => {
          c.x -= c.speed;
          if (c.x + c.width < 0) {
            c.x = CANVAS_W + 20;
            c.y = 30 + Math.random() * 80;
            c.width = 80 + Math.random() * 60;
          }
        });

        drawSky(ctx, gs.stars, gs.tick, gs.clouds);

        if (gs.playing) {
          gs.offset += gs.gameSpeed;

          // Score
          gs.score += Math.floor(gs.gameSpeed * 0.5);

          // Level up
          const newLevel = Math.floor(gs.score / 500) + 1;
          if (newLevel > gs.level) {
            gs.level = newLevel;
            gs.gameSpeed = DIFFICULTY_CONFIG[gs.difficulty].speed + (gs.level - 1) * 0.8;
            gs.flashTimer = 60;
            spawnParticles(CANVAS_W / 2, CANVAS_H / 2, PALETTE.uiAccent, 20);
          }

          // Lulu physics
          gs.luluVY += GRAVITY;
          gs.luluY += gs.luluVY;

          // Ground collision
          if (gs.luluY >= GROUND_Y) {
            gs.luluY = GROUND_Y;
            gs.luluVY = 0;
            gs.luluOnGround = true;
            gs.luluJumping = false;
          }

          // Platform collision
          let onPlat = false;
          gs.platforms.forEach((plat) => {
            if (
              gs.luluY + LULU_H >= plat.y &&
              gs.luluY + LULU_H <= plat.y + 16 &&
              gs.luluX + LULU_W > plat.x &&
              gs.luluX < plat.x + plat.width &&
              gs.luluVY >= 0
            ) {
              gs.luluY = plat.y - LULU_H;
              gs.luluVY = 0;
              gs.luluOnGround = true;
              gs.luluJumping = false;
              gs.luluDoubleJump = false;
              onPlat = true;
            }
          });

          // Move platforms
          gs.platforms.forEach((plat) => {
            plat.x -= gs.gameSpeed * 0.8;
            if (plat.x + plat.width < -20) {
              plat.x = CANVAS_W + 20 + Math.random() * 100;
              plat.y = GROUND_Y - 70 - Math.random() * 60;
              plat.width = 80 + Math.random() * 40;
            }
          });

          // Spawn obstacles
          gs.obstacleTimer++;
          const cfg = DIFFICULTY_CONFIG[gs.difficulty];
          const interval = Math.max(40, cfg.obstacleInterval - gs.level * 5);
          if (gs.obstacleTimer >= interval) {
            gs.obstacleTimer = 0;
            spawnObstacle();
          }

          // Move obstacles
          gs.obstacles.forEach((obs) => {
            obs.x -= gs.gameSpeed;
          });
          gs.obstacles = gs.obstacles.filter((obs) => obs.x + obs.width > -20);

          // Collision detection
          const margin = 4;
          for (const obs of gs.obstacles) {
            if (
              gs.luluX + LULU_W - margin > obs.x + margin &&
              gs.luluX + margin < obs.x + obs.width - margin &&
              gs.luluY + LULU_H - margin > obs.y &&
              gs.luluY + margin < obs.y + obs.height
            ) {
              spawnParticles(gs.luluX + LULU_W / 2, gs.luluY + LULU_H / 2, PALETTE.luluBody, 16);
              endGame();
              break;
            }
          }

          // Vix intro
          if (gs.vixIntro) {
            if (gs.vixX > CANVAS_W - 120) {
              gs.vixX -= 3;
            } else {
              setTimeout(() => {
                gs.vixIntro = false;
                gs.vixX = CANVAS_W + 300;
              }, 2000);
              gs.vixIntro = false;
            }
          }

          // Particles
          gs.particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life -= 0.04;
          });
          gs.particles = gs.particles.filter((p) => p.life > 0);

          // Frame counter
          if (gs.luluOnGround) {
            gs.luluFrame = Math.floor(gs.tick / 6);
          }
        }

        // Draw platforms
        gs.platforms.forEach((plat) => {
          drawRock(ctx, plat.x, plat.y, plat.width, plat.height);
        });

        drawGround(ctx, gs.offset);

        // Draw obstacles
        gs.obstacles.forEach((obs) => {
          drawObstacle(ctx, obs);
        });

        // Draw Lulu
        drawLulu(ctx, gs.luluX, gs.luluY, gs.luluFrame, gs.luluJumping);

        // Draw Vix intro
        if (gs.vixX < CANVAS_W + 50) {
          drawPrincessVix(ctx, gs.vixX, GROUND_Y - 30);
          // Speech bubble
          if (gs.vixX < CANVAS_W - 100) {
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(gs.vixX - 140, GROUND_Y - 80, 130, 36);
            ctx.strokeStyle = PALETTE.vixCrown;
            ctx.lineWidth = 2;
            ctx.strokeRect(gs.vixX - 140, GROUND_Y - 80, 130, 36);
            ctx.font = "8px 'Press Start 2P'";
            ctx.fillStyle = "#ff69b4";
            ctx.textAlign = "center";
            ctx.fillText("SAVE ME", gs.vixX - 75, GROUND_Y - 60);
            ctx.fillText("LULU!", gs.vixX - 75, GROUND_Y - 48);
          }
        }

        drawParticles(ctx, gs.particles);

        // Flash effect on level up
        if (gs.flashTimer > 0) {
          ctx.fillStyle = `rgba(255,215,0,${(gs.flashTimer / 60) * 0.3})`;
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          gs.flashTimer--;

          ctx.font = "20px 'Press Start 2P'";
          ctx.textAlign = "center";
          ctx.fillStyle = "#000";
          ctx.fillText(`LEVEL ${gs.level}!`, CANVAS_W / 2 + 2, CANVAS_H / 2 + 2);
          ctx.fillStyle = PALETTE.uiAccent;
          ctx.fillText(`LEVEL ${gs.level}!`, CANVAS_W / 2, CANVAS_H / 2);
        }

        // HUD
        if (gs.playing) {
          // Score
          pixelText(ctx, `SCORE ${gs.score}`, 10, 24, 10, PALETTE.uiAccent);
          pixelText(ctx, `LVL ${gs.level}`, CANVAS_W - 90, 24, 10, PALETTE.pixel2, "left");

          // Difficulty badge
          const diffColors = { easy: "#2ecc40", medium: "#ffd700", hard: "#ff4444" };
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(CANVAS_W / 2 - 50, 6, 100, 22);
          pixelText(ctx, DIFFICULTY_CONFIG[gs.difficulty].label, CANVAS_W / 2, 22, 8, diffColors[gs.difficulty], "center");

          // Jump hint at start
          if (gs.score < 80) {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(50, CANVAS_H - 40, 260, 26);
            pixelText(ctx, "SPACE / ↑ TO JUMP", 60, CANVAS_H - 22, 8, PALETTE.uiDim);
          }
        }

        // Game over overlay
        if (gs.screen === "gameover") {
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }
      } else {
        drawSky(ctx, gs.stars, gs.tick++, gs.clouds);
        gs.clouds.forEach((c) => {
          c.x -= c.speed;
          if (c.x + c.width < 0) c.x = CANVAS_W + 20;
        });
        drawGround(ctx, gs.offset);
        drawParticles(ctx, gs.particles);
        gs.particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.2;
          p.life -= 0.025;
        });
        gs.particles = gs.particles.filter((p) => p.life > 0);
        // Idle Lulu on menu
        drawLulu(ctx, 80, GROUND_Y, Math.floor(gs.tick / 12), false);
        drawPrincessVix(ctx, CANVAS_W - 140, GROUND_Y - 30);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [jump, endGame, spawnObstacle]);

  const handleCanvasClick = () => {
    const gs = gameStateRef.current;
    if (gs.screen === "playing" && gs.playing) {
      jump();
    }
  };

  const handleCanvasTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    handleCanvasClick();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #05051a 0%, #0a0a3a 50%, #05051a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Press Start 2P', monospace",
        userSelect: "none",
        padding: "16px",
      }}
    >
      {/* Title */}
      <div
        style={{
          marginBottom: "12px",
          textAlign: "center",
          letterSpacing: "2px",
        }}
      >
        <span
          style={{
            fontSize: "clamp(18px, 4vw, 32px)",
            color: "#2ecc40",
            textShadow: "0 0 20px #2ecc40, 3px 3px 0 #000",
            display: "block",
          }}
        >
          LULU'S
        </span>
        <span
          style={{
            fontSize: "clamp(10px, 2.5vw, 16px)",
            color: "#ffd700",
            textShadow: "0 0 10px #ffd700, 2px 2px 0 #000",
            display: "block",
            marginTop: "4px",
          }}
        >
          FLYING ROCK ADVENTURE
        </span>
      </div>

      {/* Canvas wrapper */}
      <div
        style={{
          position: "relative",
          border: "4px solid #ffd700",
          boxShadow:
            "0 0 0 4px #000, 0 0 40px rgba(255,215,0,0.3), inset 0 0 20px rgba(0,0,0,0.5)",
          imageRendering: "pixelated",
          cursor: screen === "playing" ? "pointer" : "default",
          maxWidth: "100%",
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasTouch}
          style={{ display: "block", maxWidth: "100%", imageRendering: "pixelated" }}
        />

        {/* MENU SCREEN */}
        {screen === "menu" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.55)",
              gap: "12px",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(20px, 5vw, 48px)",
                  color: "#2ecc40",
                  textShadow: "4px 4px 0 #000, 0 0 30px #2ecc40",
                  animation: "menuPulse 2s ease-in-out infinite",
                }}
              >
                LULU
              </div>
              <div
                style={{
                  fontSize: "clamp(8px, 1.5vw, 12px)",
                  color: "#ffd700",
                  marginTop: "4px",
                  textShadow: "2px 2px 0 #000",
                }}
              >
                THE GREEN HERO
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  style={{
                    padding: "6px 10px",
                    fontSize: "clamp(6px, 1.2vw, 9px)",
                    fontFamily: "'Press Start 2P', monospace",
                    background:
                      difficulty === d
                        ? d === "easy"
                          ? "#2ecc40"
                          : d === "medium"
                          ? "#ffd700"
                          : "#ff4444"
                        : "rgba(0,0,0,0.6)",
                    color: difficulty === d ? "#000" : "#aaa",
                    border: `2px solid ${
                      d === "easy" ? "#2ecc40" : d === "medium" ? "#ffd700" : "#ff4444"
                    }`,
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={() => startGame(difficulty)}
              style={{
                padding: "12px 28px",
                fontSize: "clamp(10px, 2vw, 16px)",
                fontFamily: "'Press Start 2P', monospace",
                background: "#2ecc40",
                color: "#000",
                border: "4px solid #fff",
                cursor: "pointer",
                textTransform: "uppercase",
                boxShadow: "4px 4px 0 #000, 0 0 20px rgba(46,204,64,0.5)",
                transition: "transform 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              ▶ START GAME
            </button>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setScreen("leaderboard")}
                style={{
                  padding: "8px 16px",
                  fontSize: "clamp(7px, 1.3vw, 10px)",
                  fontFamily: "'Press Start 2P', monospace",
                  background: "rgba(0,0,0,0.7)",
                  color: "#ffd700",
                  border: "2px solid #ffd700",
                  cursor: "pointer",
                  boxShadow: "2px 2px 0 #000",
                }}
              >
                🏆 SCORES
              </button>
              <button
                onClick={() => {
                  setScreen("settings");
                  gameStateRef.current.screen = "settings";
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "clamp(7px, 1.3vw, 10px)",
                  fontFamily: "'Press Start 2P', monospace",
                  background: "rgba(0,0,0,0.7)",
                  color: "#4ecdc4",
                  border: "2px solid #4ecdc4",
                  cursor: "pointer",
                  boxShadow: "2px 2px 0 #000",
                }}
              >
                ⚙ SETTINGS
              </button>
            </div>

            <div style={{ fontSize: "clamp(6px, 1vw, 8px)", color: "#666", marginTop: "4px" }}>
              SPACE / ↑ / TAP TO JUMP
            </div>
          </div>
        )}

        {/* SETTINGS SCREEN */}
        {screen === "settings" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.88)",
              gap: "16px",
            }}
          >
            <div style={{ fontSize: "clamp(14px, 3vw, 22px)", color: "#4ecdc4", textShadow: "3px 3px 0 #000" }}>
              ⚙ SETTINGS
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontSize: "8px", color: "#aaa", width: "80px", textAlign: "right" }}>SOUND</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{
                    padding: "6px 14px",
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: "8px",
                    background: soundEnabled ? "#2ecc40" : "#666",
                    color: "#000",
                    border: "2px solid #fff",
                    cursor: "pointer",
                    minWidth: "60px",
                  }}
                >
                  {soundEnabled ? "ON" : "OFF"}
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontSize: "8px", color: "#aaa", width: "80px", textAlign: "right" }}>MUSIC</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map((v) => (
                    <div
                      key={v}
                      onClick={() => setMusicVol(v)}
                      style={{
                        width: "10px",
                        height: "20px",
                        background: v <= musicVol ? "#ffd700" : "#333",
                        cursor: "pointer",
                        border: "1px solid #555",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontSize: "8px", color: "#aaa", width: "80px", textAlign: "right" }}>SFX</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1,2,3,4,5,6,7,8,9,10].map((v) => (
                    <div
                      key={v}
                      onClick={() => setSfxVol(v)}
                      style={{
                        width: "10px",
                        height: "20px",
                        background: v <= sfxVol ? "#4ecdc4" : "#333",
                        cursor: "pointer",
                        border: "1px solid #555",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setScreen("menu");
                gameStateRef.current.screen = "menu";
              }}
              style={{
                padding: "10px 24px",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "clamp(8px, 1.5vw, 12px)",
                background: "rgba(0,0,0,0.7)",
                color: "#4ecdc4",
                border: "2px solid #4ecdc4",
                cursor: "pointer",
                marginTop: "8px",
              }}
            >
              ← BACK
            </button>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {screen === "gameover" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                fontSize: "clamp(18px, 4vw, 36px)",
                color: "#ff4444",
                textShadow: "4px 4px 0 #000, 0 0 30px #ff4444",
                animation: "shake 0.5s ease-in-out",
              }}
            >
              GAME OVER
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(8px, 1.5vw, 12px)", color: "#ffd700", marginBottom: "4px" }}>
                SCORE: {finalScore}
              </div>
              <div style={{ fontSize: "clamp(7px, 1.2vw, 10px)", color: "#4ecdc4" }}>
                LEVEL: {finalLevel}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div style={{ fontSize: "8px", color: "#aaa" }}>ENTER YOUR NAME:</div>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase().slice(0, 8))}
                maxLength={8}
                style={{
                  background: "rgba(0,0,0,0.8)",
                  border: "2px solid #ffd700",
                  color: "#ffd700",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "14px",
                  padding: "6px 10px",
                  textAlign: "center",
                  width: "160px",
                  outline: "none",
                  textTransform: "uppercase",
                }}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                onClick={() => saveScore(playerName)}
                style={{
                  padding: "10px 20px",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "clamp(8px, 1.5vw, 11px)",
                  background: "#ffd700",
                  color: "#000",
                  border: "3px solid #fff",
                  cursor: "pointer",
                  boxShadow: "3px 3px 0 #000",
                }}
              >
                🏆 SAVE SCORE
              </button>
              <button
                onClick={() => startGame(gameStateRef.current.difficulty)}
                style={{
                  padding: "10px 20px",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "clamp(8px, 1.5vw, 11px)",
                  background: "#2ecc40",
                  color: "#000",
                  border: "3px solid #fff",
                  cursor: "pointer",
                  boxShadow: "3px 3px 0 #000",
                }}
              >
                ▶ RETRY
              </button>
              <button
                onClick={() => {
                  setScreen("menu");
                  gameStateRef.current.screen = "menu";
                  gameStateRef.current.playing = false;
                }}
                style={{
                  padding: "10px 20px",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "clamp(8px, 1.5vw, 11px)",
                  background: "rgba(0,0,0,0.7)",
                  color: "#aaa",
                  border: "3px solid #555",
                  cursor: "pointer",
                  boxShadow: "3px 3px 0 #000",
                }}
              >
                ← MENU
              </button>
            </div>
          </div>
        )}

        {/* LEADERBOARD SCREEN */}
        {screen === "leaderboard" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              background: "rgba(0,0,15,0.92)",
              padding: "20px 16px",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "clamp(14px, 3vw, 22px)", color: "#ffd700", textShadow: "3px 3px 0 #000" }}>
              🏆 HIGH SCORES
            </div>

            <div style={{ width: "100%", maxWidth: "600px" }}>
              {scores.length === 0 ? (
                <div style={{ textAlign: "center", color: "#555", fontSize: "10px", marginTop: "40px" }}>
                  NO SCORES YET!
                  <br />
                  <span style={{ color: "#333" }}>BE THE FIRST!</span>
                </div>
              ) : (
                scores.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "6px 12px",
                      marginBottom: "4px",
                      background:
                        i === 0
                          ? "rgba(255,215,0,0.15)"
                          : i === 1
                          ? "rgba(192,192,192,0.1)"
                          : i === 2
                          ? "rgba(205,127,50,0.1)"
                          : "rgba(255,255,255,0.04)",
                      border: `1px solid ${
                        i === 0 ? "#ffd700" : i === 1 ? "#888" : i === 2 ? "#8B4513" : "#222"
                      }`,
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "clamp(8px, 1.5vw, 12px)",
                        color: i === 0 ? "#ffd700" : i === 1 ? "#aaa" : i === 2 ? "#cd853f" : "#555",
                        minWidth: "30px",
                      }}
                    >
                      #{i + 1}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "clamp(7px, 1.2vw, 10px)",
                        color: "#fff",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {entry.name}
                    </span>
                    <span style={{ fontSize: "clamp(7px, 1.2vw, 10px)", color: "#ffd700" }}>
                      {entry.score}
                    </span>
                    <span style={{ fontSize: "clamp(6px, 1vw, 8px)", color: "#4ecdc4", minWidth: "40px", textAlign: "right" }}>
                      LV{entry.level}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "auto", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                onClick={() => {
                  setScreen("menu");
                  gameStateRef.current.screen = "menu";
                }}
                style={{
                  padding: "8px 18px",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "clamp(7px, 1.3vw, 10px)",
                  background: "rgba(0,0,0,0.7)",
                  color: "#4ecdc4",
                  border: "2px solid #4ecdc4",
                  cursor: "pointer",
                }}
              >
                ← MENU
              </button>
              <button
                onClick={() => startGame(difficulty)}
                style={{
                  padding: "8px 18px",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "clamp(7px, 1.3vw, 10px)",
                  background: "#2ecc40",
                  color: "#000",
                  border: "2px solid #fff",
                  cursor: "pointer",
                }}
              >
                ▶ PLAY
              </button>
              {scores.length > 0 && (
                <button
                  onClick={() => {
                    setScores([]);
                    localStorage.removeItem("luluScores");
                  }}
                  style={{
                    padding: "8px 18px",
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: "clamp(7px, 1.3vw, 10px)",
                    background: "rgba(0,0,0,0.7)",
                    color: "#ff4444",
                    border: "2px solid #ff4444",
                    cursor: "pointer",
                  }}
                >
                  🗑 CLEAR
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div
        style={{
          marginTop: "10px",
          fontSize: "clamp(6px, 1vw, 8px)",
          color: "#333",
          textAlign: "center",
          letterSpacing: "1px",
        }}
      >
        SPACE / ARROW UP / CLICK / TAP — JUMP &nbsp;|&nbsp; DOUBLE JUMP AVAILABLE!
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes menuPulse {
          0%, 100% { text-shadow: 4px 4px 0 #000, 0 0 20px #2ecc40; }
          50% { text-shadow: 4px 4px 0 #000, 0 0 50px #2ecc40, 0 0 80px #2ecc40; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
