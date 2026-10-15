const W = 1280;
    const H = 960;
    const platform = window.NeonPlatform;
    if (!platform) throw new Error("NeonWings platform runtime missing");
    const controller = window.NeonController;
    if (!controller) throw new Error("NeonWings controller runtime missing");
    const combatRules = window.NeonCombat;
    if (!combatRules) throw new Error("NeonWings combat runtime missing");
    const collision = window.NeonCollision;
    if (!collision) throw new Error("NeonWings collision runtime missing");
    const enemyBehaviors = window.NeonEnemyBehaviors;
    if (!enemyBehaviors) throw new Error("NeonWings enemy behavior runtime missing");
    const worlds = window.NeonWorlds;
    if (!worlds) throw new Error("NeonWings world runtime missing");
    const bossParts = window.NeonBossParts;
    if (!bossParts) throw new Error("NeonWings boss parts runtime missing");
    const modes = window.NeonModes;
    if (!modes) throw new Error("NeonWings arcade-mode runtime missing");
    const records = window.NeonRecords;
    if (!records) throw new Error("NeonWings local records runtime missing");
    const selectLayout = window.NeonSelectLayout;
    if (!selectLayout) throw new Error("NeonWings selection layout runtime missing");
    let recordsStorage = null;
    try { recordsStorage = localStorage; } catch (_) {
      // Sandboxed/private browsing may deny even reading the storage property.
    }
    const recordStore = records.createStore(recordsStorage);
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d", { alpha: false });

    const HIGH_SCORE_KEY = "neon_wings_ayaneo_high_score_v11";
    const LIMITS = Object.freeze({
      particles: 800,
      enemyBullets: 340,
      playerBullets: 240,
      missiles: 48,
      enemies: enemyBehaviors.CONFIG.maxEnemies
    });

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const rand = (min, max) => min + Math.random() * (max - min);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const dist = (a, b, c, d) => Math.hypot(a - c, b - d);

    const keys = {};
    const gamepadEdge = {
      start: false,
      select: false,
      up: false,
      down: false,
      left: false,
      right: false,
      lb: false,
      rb: false,
      x: false,
      a: false,
      b: false,
      bomb: false,
      overdrive: false,
      any: false
    };

    const ships = [
      {
        id: "falcon",
        name: "FALCON-01",
        subtitle: "高速突击型",
        desc: "横版用轻型现代战斗机，机头朝右，机动更快，适合高速闪避。",
        accent: "#38e8ff",
        core: "#e8fdff",
        speed: 620,
        hitbox: 24,
        hpStart: 3,
        hpMax: 5
      },
      {
        id: "vanguard",
        name: "VANGUARD-02",
        subtitle: "重装压制型",
        desc: "横版用重型攻击机，机头朝右，装甲更厚，初始生命更高。",
        accent: "#ffd76b",
        core: "#fff4b7",
        speed: 525,
        hitbox: 30,
        hpStart: 4,
        hpMax: 6
      }
    ];

    const stages = [
      {
        name: "STAGE 1  SKYLINE RAID",
        short: "SKYLINE",
        bgTop: "#071227",
        bgMid: "#101c42",
        bgBot: "#1a1231",
        grid: "#38e8ff",
        kills: 32,
        enemies: ["scout", "gunner"],
        boss: {
          name: "BOSS 1  GATE WARDEN",
          hp: 650,
          color: "#ff8aa7",
          core: "#ffd2de",
          pattern: 0,
          rx: 92,
          ry: 76
        }
      },
      {
        name: "STAGE 2  RED CANYON",
        short: "CANYON",
        bgTop: "#170c0d",
        bgMid: "#3b1715",
        bgBot: "#1e1022",
        grid: "#ff8f5f",
        kills: 38,
        enemies: ["zigzag", "bomber", "gunner"],
        boss: {
          name: "BOSS 2  DUST SERPENT",
          hp: 850,
          color: "#ffb15f",
          core: "#fff0b2",
          pattern: 1,
          rx: 110,
          ry: 68
        }
      },
      {
        name: "STAGE 3  FROZEN ORBIT",
        short: "ORBIT",
        bgTop: "#071522",
        bgMid: "#0f2a47",
        bgBot: "#101d32",
        grid: "#9befff",
        kills: 44,
        enemies: ["sniper", "shield", "drone"],
        boss: {
          name: "BOSS 3  ICE BREAKER",
          hp: 1050,
          color: "#9befff",
          core: "#e8fdff",
          pattern: 2,
          rx: 122,
          ry: 82
        }
      },
      {
        name: "STAGE 4  BIOMECH HIVE",
        short: "HIVE",
        bgTop: "#091612",
        bgMid: "#16341e",
        bgBot: "#151323",
        grid: "#69ff8f",
        kills: 50,
        enemies: ["orb", "splitter", "bomber"],
        boss: {
          name: "BOSS 4  PRISM MANTIS",
          hp: 1250,
          color: "#69ff8f",
          core: "#eaffef",
          pattern: 3,
          rx: 118,
          ry: 90
        }
      },
      {
        name: "STAGE 5  NOVA CITADEL",
        short: "CITADEL",
        bgTop: "#100a20",
        bgMid: "#231448",
        bgBot: "#090812",
        grid: "#c084ff",
        kills: 58,
        enemies: ["elite", "carrier", "sniper", "shield"],
        boss: {
          name: "FINAL BOSS  NOVA FORTRESS",
          hp: 1600,
          color: "#c084ff",
          core: "#fff4b7",
          pattern: 4,
          rx: 142,
          ry: 104
        }
      }
    ];

    let menu = {
      selectedShip: 0,
      selectedMode: "classic",
      trainingStage: 0
    };

    function selectedShip() {
      return ships[menu.selectedShip];
    }

    const SETTINGS_KEY = "neon_wings_ayaneo_settings_v21";
    const AUDIO_BASE = {
      master: 0.86,
      sfx: 1.38,
      bgm: 0.46,
      wet: 0.34
    };

    const DEFAULT_SETTINGS = {
      master: 1.0,
      sfx: 1.0,
      bgm: 1.0,
      haptics: true,
      hapticStrength: 1.0,
      ...controller.DEFAULTS
    };

    let settings = loadSettings();

    let pauseMenu = {
      page: "main",
      index: 0
    };

    const pauseItems = [
      "RESUME",
      "RESTART RUN",
      "RETURN TO TITLE",
      "MASTER VOLUME",
      "SFX VOLUME",
      "BGM VOLUME",
      "VIBRATION",
      "VIBRATION STRENGTH",
      "CONTROLLER OPTIONS"
    ];

    const controllerItems = [
      "BACK",
      "FIRE PRIMARY",
      "FIRE SECONDARY",
      "BOMB BUTTON",
      "OVERDRIVE BUTTON",
      "STICK DEADZONE",
      "RESTORE DEFAULTS"
    ];

    function loadSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const stored = raw ? JSON.parse(raw) : {};
        const parsed = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
        return {
          ...DEFAULT_SETTINGS,
          ...controller.sanitizeSettings(parsed),
          master: platform.finiteClamped(parsed.master, DEFAULT_SETTINGS.master, 0, 1.6),
          sfx: platform.finiteClamped(parsed.sfx, DEFAULT_SETTINGS.sfx, 0, 1.8),
          bgm: platform.finiteClamped(parsed.bgm, DEFAULT_SETTINGS.bgm, 0, 1.8),
          hapticStrength: platform.finiteClamped(parsed.hapticStrength, DEFAULT_SETTINGS.hapticStrength, 0.15, 1),
          haptics: parsed.haptics !== false
        };
      } catch (_) {
        return { ...DEFAULT_SETTINGS };
      }
    }

    function saveSettings() {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (_) {}
      applyAudioSettings();
    }

    function applyAudioSettings() {
      if (masterGain) masterGain.gain.value = AUDIO_BASE.master * settings.master;
      if (sfxGain) sfxGain.gain.value = AUDIO_BASE.sfx * settings.sfx;
      if (bgmGain) bgmGain.gain.value = AUDIO_BASE.bgm * settings.bgm;
      if (fxWet) fxWet.gain.value = AUDIO_BASE.wet * settings.master;
    }

    function pct(v) {
      return `${Math.round(v * 100)}%`;
    }

    function currentPauseItems() {
      return pauseMenu.page === "controls" ? controllerItems : pauseItems;
    }

    function pauseMenuMove(dir) {
      const items = currentPauseItems();
      pauseMenu.index = (pauseMenu.index + dir + items.length) % items.length;
      sfx("select");
    }

    function adjustPauseItem(dir) {
      const i = pauseMenu.index;
      if (pauseMenu.page === "controls") {
        if (i === 1) {
          settings.firePrimary = controller.cycleButton(settings.firePrimary, dir, [settings.fireSecondary, settings.bombButton, settings.overdriveButton]);
        } else if (i === 2) {
          settings.fireSecondary = controller.cycleButton(settings.fireSecondary, dir, [settings.firePrimary, settings.bombButton, settings.overdriveButton]);
        } else if (i === 3) {
          settings.bombButton = controller.cycleButton(settings.bombButton, dir, [settings.firePrimary, settings.fireSecondary, settings.overdriveButton]);
        } else if (i === 4) {
          settings.overdriveButton = controller.cycleButton(settings.overdriveButton, dir, [settings.firePrimary, settings.fireSecondary, settings.bombButton]);
        } else if (i === 5) {
          settings.stickDeadzone = clamp(Math.round(settings.stickDeadzone * 100 + dir * 2) / 100, 0.08, 0.44);
        } else {
          return;
        }
      } else {
        const step = 0.1;
        if (i === 3) {
          settings.master = clamp(Math.round((settings.master + dir * step) * 10) / 10, 0, 1.6);
        } else if (i === 4) {
          settings.sfx = clamp(Math.round((settings.sfx + dir * step) * 10) / 10, 0, 1.8);
        } else if (i === 5) {
          settings.bgm = clamp(Math.round((settings.bgm + dir * step) * 10) / 10, 0, 1.8);
        } else if (i === 6) {
          settings.haptics = !settings.haptics;
        } else if (i === 7) {
          settings.hapticStrength = clamp(Math.round((settings.hapticStrength + dir * step) * 10) / 10, 0.2, 1.0);
        } else {
          return;
        }
      }
      saveSettings();
      sfx("select");
      if (settings.haptics) haptic("setting", 0.18, 0.16, 35, 0.05);
    }

    function pauseItemValue(index) {
      if (pauseMenu.page === "controls") {
        if (index === 1) return controller.buttonLabel(settings.firePrimary);
        if (index === 2) return controller.buttonLabel(settings.fireSecondary);
        if (index === 3) return controller.buttonLabel(settings.bombButton);
        if (index === 4) return controller.buttonLabel(settings.overdriveButton);
        if (index === 5) return pct(settings.stickDeadzone);
        return "";
      }
      if (index === 3) return pct(settings.master);
      if (index === 4) return pct(settings.sfx);
      if (index === 5) return pct(settings.bgm);
      if (index === 6) return settings.haptics ? "ON" : "OFF";
      if (index === 7) return pct(settings.hapticStrength);
      return "";
    }

    function pauseGame() {
      stopBgm();
      pauseMenu.page = "main";
      pauseMenu.index = 0;
      game.state = "PAUSED";
      showMessage("PAUSED");
    }

    function resumeGame() {
      pauseMenu.page = "main";
      controllerNotice = "";
      game.state = "PLAYING";
      startBgm();
      showMessage("RESUME");
    }

    function activatePauseItem() {
      const i = pauseMenu.index;
      if (pauseMenu.page === "controls") {
        if (i === 0) {
          pauseMenu.page = "main";
          pauseMenu.index = pauseItems.length - 1;
          sfx("select");
        } else if (i === 6) {
          Object.assign(settings, controller.DEFAULTS);
          saveSettings();
          sfx("confirm");
        } else {
          adjustPauseItem(1);
        }
        return;
      }
      if (i === 0) {
        resumeGame();
      } else if (i === 1) {
        startSelectedGame();
      } else if (i === 2) {
        returnToTitle();
      } else if (i === pauseItems.length - 1) {
        pauseMenu.page = "controls";
        pauseMenu.index = 0;
        sfx("confirm");
      } else {
        adjustPauseItem(1);
      }
    }

    let audioCtx = null;
    let audioEnabled = false;
    let masterGain = null;
    let limiter = null;
    let sfxGain = null;
    let bgmGain = null;
    let fxDelay = null;
    let fxFeedback = null;
    let fxWet = null;
    let lastSfxAt = {};

    let bgm = {
      playing: false,
      timer: 0,
      nextTime: 0,
      step: 0,
      stageIndex: -1,
      loop: 1
    };

    function initAudio() {
      if (audioCtx) return;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      audioCtx = new AudioContextClass();

      masterGain = audioCtx.createGain();
      // Loud mix with user-adjustable settings. A compressor/limiter follows
      // the master bus so high volume avoids harsh clipping on Android speakers.
      masterGain.gain.value = AUDIO_BASE.master * settings.master;

      limiter = audioCtx.createDynamicsCompressor();
      limiter.threshold.value = -7;
      limiter.knee.value = 9;
      limiter.ratio.value = 10;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.18;

      masterGain.connect(limiter);
      limiter.connect(audioCtx.destination);

      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = AUDIO_BASE.sfx * settings.sfx;
      sfxGain.connect(masterGain);

      bgmGain = audioCtx.createGain();
      bgmGain.gain.value = AUDIO_BASE.bgm * settings.bgm;
      bgmGain.connect(masterGain);

      // Shared delay bus: gives shots, pickups and BGM a wider sci-fi space.
      fxDelay = audioCtx.createDelay(0.65);
      fxDelay.delayTime.value = 0.19;

      fxFeedback = audioCtx.createGain();
      fxFeedback.gain.value = 0.23;

      fxWet = audioCtx.createGain();
      fxWet.gain.value = AUDIO_BASE.wet * settings.master;

      fxDelay.connect(fxFeedback);
      fxFeedback.connect(fxDelay);
      fxDelay.connect(fxWet);
      fxWet.connect(masterGain);

      applyAudioSettings();
    }

    function unlockAudio() {
      initAudio();
      if (!audioCtx) return;

      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }

      audioEnabled = true;
    }

    function sfxAllowed(name, gap = 0.02) {
      if (!audioEnabled || !audioCtx || !masterGain) return false;

      const now = audioCtx.currentTime;
      if ((lastSfxAt[name] || 0) + gap > now) return false;

      lastSfxAt[name] = now;
      return true;
    }

    let lastHapticAt = {};

    function hapticAllowed(name, gap = 0.08) {
      const now = performance.now() / 1000;
      if ((lastHapticAt[name] || 0) + gap > now) return false;
      lastHapticAt[name] = now;
      return true;
    }

    function haptic(name, strong = 0.4, weak = 0.3, duration = 60, gap = 0.08) {
      if (!settings.haptics) return;
      if (!hapticAllowed(name, gap)) return;

      strong *= settings.hapticStrength;
      weak *= settings.hapticStrength;

      const pad = readActivePad();

      // Chromium / Android Gamepad Haptics. AYANEO devices may expose this
      // through the browser when running in Chrome or compatible WebView.
      const actuator = pad?.vibrationActuator;
      if (actuator?.playEffect) {
        actuator.playEffect("dual-rumble", {
          startDelay: 0,
          duration,
          weakMagnitude: clamp(weak, 0, 1),
          strongMagnitude: clamp(strong, 0, 1)
        }).catch(() => {});
        return;
      }

      // Older draft API fallback.
      const legacy = pad?.hapticActuators?.[0];
      if (legacy?.pulse) {
        legacy.pulse(clamp(Math.max(strong, weak), 0, 1), duration).catch(() => {});
        return;
      }

      // Android browser fallback. Some browsers ignore this, but it is safe.
      if (navigator.vibrate) {
        navigator.vibrate(Math.max(8, Math.round(duration)));
      }
    }

    function hapticShot() {
      haptic("shot", 0.05, 0.08, 12, 0.055);
    }

    function hapticPickup() {
      haptic("pickup", 0.18, 0.22, 38, 0.08);
    }

    function hapticExplosion() {
      haptic("explode", 0.62, 0.44, 95, 0.09);
    }

    function hapticDamage() {
      haptic("damage", 0.85, 0.72, 160, 0.18);
    }

    function hapticBoss() {
      haptic("boss", 0.75, 0.65, 260, 0.8);
    }

    function hapticClear() {
      haptic("clear", 0.38, 0.42, 140, 0.45);
    }

    function hapticBomb() {
      haptic("bomb", 1.0, 0.9, 420, 0.7);
    }

    function connectWithPan(node, pan = 0, useDelay = false) {
      const p = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

      if (p) {
        p.pan.value = clamp(pan, -1, 1);
        node.connect(p);
        p.connect(sfxGain);
        if (useDelay) p.connect(fxDelay);
      } else {
        node.connect(sfxGain);
        if (useDelay) node.connect(fxDelay);
      }
    }

    function playTone(freq = 440, duration = 0.08, type = "square", gain = 0.12, slide = 1, pan = 0, useDelay = true) {
      if (!audioEnabled || !audioCtx || !sfxGain) return;

      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(35, freq * slide), t + duration);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(g);
      connectWithPan(g, pan, useDelay);

      osc.start(t);
      osc.stop(t + duration + 0.03);
    }

    function playNoise(duration = 0.16, gain = 0.12, filterFreq = 900, pan = 0, useDelay = true, filterType = "lowpass") {
      if (!audioEnabled || !audioCtx || !sfxGain) return;

      const sampleRate = audioCtx.sampleRate;
      const length = Math.max(1, Math.floor(sampleRate * duration));
      const buffer = audioCtx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        const fade = 1 - i / length;
        data[i] = (Math.random() * 2 - 1) * fade * fade;
      }

      const src = audioCtx.createBufferSource();
      const filter = audioCtx.createBiquadFilter();
      const g = audioCtx.createGain();
      const t = audioCtx.currentTime;

      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(70, filterFreq * 0.25), t + duration);

      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      src.buffer = buffer;
      src.connect(filter);
      filter.connect(g);
      connectWithPan(g, pan, useDelay);

      src.start(t);
      src.stop(t + duration + 0.03);
    }

    function playLaserSweep(freqA, freqB, duration, gain, pan = 0) {
      if (!audioEnabled || !audioCtx || !sfxGain) return;

      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const mod = audioCtx.createOscillator();
      const modGain = audioCtx.createGain();
      const g = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = "sawtooth";
      mod.type = "sine";

      osc.frequency.setValueAtTime(freqA, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqB), t + duration);

      mod.frequency.setValueAtTime(38, t);
      modGain.gain.setValueAtTime(18, t);
      mod.connect(modGain);
      modGain.connect(osc.frequency);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(freqA * 2, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(120, freqB * 1.2), t + duration);
      filter.Q.value = 7;

      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(filter);
      filter.connect(g);
      connectWithPan(g, pan, true);

      osc.start(t);
      mod.start(t);
      osc.stop(t + duration + 0.03);
      mod.stop(t + duration + 0.03);
    }

    function playBgmToneAt(time, freq, duration, type = "sawtooth", gain = 0.05, pan = 0, filterFreq = 1200) {
      if (!audioEnabled || !audioCtx || !bgmGain) return;

      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const g = audioCtx.createGain();
      const p = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterFreq, time);
      filter.Q.value = 1.4;

      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(gain, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      filter.connect(g);

      if (p) {
        p.pan.value = clamp(pan, -1, 1);
        g.connect(p);
        p.connect(bgmGain);
        p.connect(fxDelay);
      } else {
        g.connect(bgmGain);
        g.connect(fxDelay);
      }

      osc.start(time);
      osc.stop(time + duration + 0.03);
    }

    function playBgmNoiseAt(time, duration, gain = 0.035, filterFreq = 1400) {
      if (!audioEnabled || !audioCtx || !bgmGain) return;

      const sampleRate = audioCtx.sampleRate;
      const length = Math.max(1, Math.floor(sampleRate * duration));
      const buffer = audioCtx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < length; i++) {
        const fade = 1 - i / length;
        data[i] = (Math.random() * 2 - 1) * fade;
      }

      const src = audioCtx.createBufferSource();
      const filter = audioCtx.createBiquadFilter();
      const g = audioCtx.createGain();

      filter.type = "highpass";
      filter.frequency.setValueAtTime(filterFreq, time);
      g.gain.setValueAtTime(gain, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      src.buffer = buffer;
      src.connect(filter);
      filter.connect(g);
      g.connect(bgmGain);

      src.start(time);
      src.stop(time + duration + 0.02);
    }

    function bgmScaleForStage(stageIndex = 0, loop = 1) {
      const roots = [55, 61.74, 65.41, 49, 46.25]; // A1, B1, C2, G1, F#1-ish
      const root = roots[stageIndex % roots.length] * (loop >= 3 ? 1.06 : 1);
      return [root, root * 1.189, root * 1.335, root * 1.498, root * 1.682, root * 2];
    }

    function startBgm() {
      unlockAudio();
      if (!audioCtx || !audioEnabled) return;

      if (bgm.playing && bgm.stageIndex === game.stageIndex && bgm.loop === game.loop) return;

      stopBgm();

      bgm.playing = true;
      bgm.stageIndex = game.stageIndex;
      bgm.loop = game.loop;
      bgm.step = 0;
      bgm.nextTime = audioCtx.currentTime + 0.04;

      bgm.timer = setInterval(scheduleBgm, 85);
      scheduleBgm();
    }

    function stopBgm() {
      if (bgm.timer) clearInterval(bgm.timer);
      bgm.timer = 0;
      bgm.playing = false;
    }

    function scheduleBgm() {
      if (!audioEnabled || !audioCtx || !bgm.playing || game.state !== "PLAYING") return;

      const lookahead = 0.38;
      const stepDur = Math.max(0.105, 0.135 - (game.loop - 1) * 0.006);
      const scale = bgmScaleForStage(game.stageIndex, game.loop);
      const bossMode = game.stageMode === "BOSS" || !!game.boss;

      while (bgm.nextTime < audioCtx.currentTime + lookahead) {
        const step = bgm.step % 32;
        const bar = Math.floor(bgm.step / 32) % 4;
        const root = scale[0];
        const tense = bossMode ? 1.18 : 1;

        // Sub drone / bass pulse.
        if (step % 4 === 0) {
          const bassDegree = bossMode
            ? [0, 3, 1, 4][(step / 4 + bar) % 4]
            : [0, 0, 2, 1][(step / 4 + bar) % 4];
          playBgmToneAt(bgm.nextTime, scale[bassDegree] * tense, stepDur * 3.2, "sawtooth", bossMode ? 0.070 : 0.058, -0.12, bossMode ? 620 : 520);
        }

        // Driving arpeggio.
        if (step % 2 === 0) {
          const seq = bossMode
            ? [0, 4, 2, 5, 1, 4, 3, 5]
            : [0, 2, 4, 2, 1, 3, 5, 3];
          const degree = seq[(step / 2) % seq.length];
          const freq = scale[degree] * 4;
          const pan = ((step % 8) - 3.5) / 5.5;
          playBgmToneAt(bgm.nextTime, freq, stepDur * 1.3, "square", bossMode ? 0.043 : 0.035, pan, bossMode ? 2200 : 1700);
        }

        // Space percussion: muted kick + hats.
        if (step % 8 === 0 || (bossMode && step % 8 === 4)) {
          playBgmToneAt(bgm.nextTime, bossMode ? 92 : 76, stepDur * 1.6, "sine", bossMode ? 0.078 : 0.058, 0, 420);
        }

        if (step % 4 === 2 || (bossMode && step % 4 === 1)) {
          playBgmNoiseAt(bgm.nextTime, 0.035, bossMode ? 0.030 : 0.022, bossMode ? 2600 : 2100);
        }

        // Wide pad every bar.
        if (step === 0 || step === 16) {
          const padA = bossMode ? scale[1] * 2 : scale[0] * 2;
          const padB = bossMode ? scale[4] * 2 : scale[3] * 2;
          playBgmToneAt(bgm.nextTime, padA, stepDur * 16, "triangle", 0.028, -0.35, 900);
          playBgmToneAt(bgm.nextTime, padB, stepDur * 16, "triangle", 0.025, 0.35, 950);
        }

        bgm.step += 1;
        bgm.nextTime += stepDur;
      }
    }

    function sfx(name) {
      const pxPan = game && game.player ? (game.player.x / W) * 2 - 1 : 0;

      if (name === "shot") {
        if (!sfxAllowed("shot", 0.040)) return;
        playLaserSweep(1050, 1840, 0.055, 0.070, pxPan);
        playTone(310, 0.045, "square", 0.040, 1.25, pxPan, false);
      } else if (name === "missile") {
        if (!sfxAllowed("missile", 0.095)) return;
        playLaserSweep(180, 420, 0.18, 0.085, pxPan);
        playNoise(0.12, 0.065, 650, pxPan, true, "lowpass");
      } else if (name === "enemyHit") {
        if (!sfxAllowed("enemyHit", 0.030)) return;
        playLaserSweep(620, 260, 0.045, 0.055, 0.35);
      } else if (name === "explode") {
        if (!sfxAllowed("explode", 0.070)) return;
        playNoise(0.32, 0.22, 1500, 0.25, true, "lowpass");
        playTone(115, 0.24, "sawtooth", 0.115, 0.45, 0.2, true);
        playTone(58, 0.28, "sine", 0.085, 0.72, 0.0, false);
      } else if (name === "pickupP") {
        if (!sfxAllowed("pickupP", 0.080)) return;
        playTone(520, 0.07, "triangle", 0.080, 1.55, 0, true);
        setTimeout(() => playTone(860, 0.08, "triangle", 0.070, 1.35, 0, true), 45);
        setTimeout(() => playTone(1220, 0.06, "sine", 0.045, 1.15, 0, true), 95);
      } else if (name === "pickupHp") {
        if (!sfxAllowed("pickupHp", 0.080)) return;
        playTone(360, 0.09, "sine", 0.080, 1.28, 0, true);
        setTimeout(() => playTone(540, 0.10, "sine", 0.075, 1.2, 0, true), 55);
        setTimeout(() => playTone(720, 0.08, "sine", 0.055, 1.1, 0, true), 115);
      } else if (name === "damage") {
        if (!sfxAllowed("damage", 0.160)) return;
        playNoise(0.25, 0.21, 700, -0.25, true, "lowpass");
        playTone(190, 0.20, "sawtooth", 0.125, 0.48, -0.2, true);
      } else if (name === "boss") {
        if (!sfxAllowed("boss", 1.0)) return;
        playTone(92, 0.45, "sawtooth", 0.165, 0.65, 0.18, true);
        setTimeout(() => playTone(138, 0.36, "sawtooth", 0.135, 0.58, 0.22, true), 140);
        setTimeout(() => playNoise(0.36, 0.125, 980, 0.25, true, "lowpass"), 220);
      } else if (name === "clear") {
        if (!sfxAllowed("clear", 0.6)) return;
        playTone(440, 0.10, "triangle", 0.080, 1.2, 0, true);
        setTimeout(() => playTone(660, 0.12, "triangle", 0.080, 1.25, 0, true), 90);
        setTimeout(() => playTone(990, 0.18, "triangle", 0.075, 1.1, 0, true), 190);
      } else if (name === "gameOver") {
        if (!sfxAllowed("gameOver", 1.0)) return;
        stopBgm();
        playTone(360, 0.24, "sawtooth", 0.090, 0.70, 0, true);
        setTimeout(() => playTone(220, 0.34, "sawtooth", 0.090, 0.52, 0, true), 150);
        setTimeout(() => playTone(110, 0.42, "sine", 0.065, 0.50, 0, false), 360);
      } else if (name === "bomb") {
        if (!sfxAllowed("bomb", 0.8)) return;
        playTone(66, 0.42, "sawtooth", 0.22, 1.8, 0, true);
        playTone(132, 0.38, "sawtooth", 0.16, 1.35, 0, true);
        playNoise(0.55, 0.26, 1800, 0, true, "lowpass");
        setTimeout(() => playLaserSweep(280, 1600, 0.32, 0.14, 0), 80);
      } else if (name === "hazardWarn") {
        if (!sfxAllowed("hazardWarn", 0.9)) return;
        playTone(720, 0.20, "triangle", 0.075, 0.60, 0, false);
        playTone(480, 0.26, "sine", 0.060, 0.73, 0, false);
      } else if (name === "graze") {
        if (!sfxAllowed("graze", 0.13)) return;
        playTone(1250, 0.04, "triangle", 0.022, 1.16, pxPan, false);
      } else if (name === "overdriveReady") {
        if (!sfxAllowed("overdriveReady", 0.5)) return;
        playTone(620, 0.15, "triangle", 0.085, 1.5, 0, true);
        playTone(930, 0.18, "triangle", 0.06, 1.3, 0.12, true);
      } else if (name === "overdriveOn") {
        if (!sfxAllowed("overdriveOn", 0.35)) return;
        playLaserSweep(240, 1420, 0.44, 0.14, 0);
        playTone(115, 0.34, "sawtooth", 0.12, 1.6, 0, true);
      } else if (name === "overdriveOff") {
        if (!sfxAllowed("overdriveOff", 0.35)) return;
        playTone(650, 0.17, "triangle", 0.07, 0.5, 0, true);
      } else if (name === "select") {
        if (!sfxAllowed("select", 0.080)) return;
        playTone(720, 0.050, "triangle", 0.050, 1.18, 0, true);
      } else if (name === "confirm") {
        if (!sfxAllowed("confirm", 0.120)) return;
        playTone(520, 0.070, "triangle", 0.075, 1.25, 0, true);
        setTimeout(() => playTone(780, 0.080, "triangle", 0.065, 1.20, 0, true), 50);
      }
    }

    let cachedHighScore = 0;

    function highScore() {
      try {
        const value = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
        if (Number.isFinite(value) && value >= 0) {
          cachedHighScore = Math.max(cachedHighScore, value);
        }
      } catch (_) {
        // Some privacy modes disallow localStorage. Keep this run playable.
      }
      return cachedHighScore;
    }

    function saveHighScore(score) {
      const best = Math.max(highScore(), score);
      cachedHighScore = best;
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(best));
      } catch (_) {
        // In-memory fallback for storage-restricted environments.
      }
      return best;
    }

    // Keep Classic's historical leaderboard key unchanged.
    const BOSS_RUSH_HIGH_SCORE_KEY = "neon_wings_boss_rush_best_v26";
    let cachedBossRushBest = 0;

    function modeHighScore(modeId) {
      if (modeId === "classic") return highScore();
      if (!modes.ranked(modeId)) return 0;
      try {
        const raw = Number(localStorage.getItem(BOSS_RUSH_HIGH_SCORE_KEY) || 0);
        if (Number.isFinite(raw) && raw >= 0) cachedBossRushBest = Math.max(cachedBossRushBest, raw);
      } catch (_) {
        // Private browsing or disabled storage must not block a run.
      }
      return cachedBossRushBest;
    }

    function saveModeHighScore(modeId, score) {
      if (modeId === "classic") return saveHighScore(score);
      if (!modes.ranked(modeId)) return 0;
      cachedBossRushBest = Math.max(modeHighScore(modeId), Math.max(0, Math.round(score)));
      try { localStorage.setItem(BOSS_RUSH_HIGH_SCORE_KEY, String(cachedBossRushBest)); }
      catch (_) {}
      return cachedBossRushBest;
    }

    function rankedRunSummary(clear = false) {
      return {
        mode: game.mode,
        score: game.score,
        ship: selectedShip().id,
        bossesDefeated: game.stats.bossesDefeated,
        reachedStage: game.stats.reachedStage,
        loop: game.loop,
        damageTaken: game.stats.damageTaken,
        bombsUsed: game.stats.bombsUsed,
        grazes: game.combat.grazes,
        maxCombo: game.combat.maxCombo,
        activations: game.combat.activations,
        clear
      };
    }

    function archiveRankedRun(clear = false) {
      if (!modes.ranked(game.mode) || game.resultGrade) return;
      const summary = rankedRunSummary(clear);
      game.resultGrade = records.grade(game.mode, summary, clear);
      summary.grade = game.resultGrade;
      game.newBadges = recordStore.unlock(summary, {rushClear:game.mode === "bossRush" && clear});
      recordStore.add(summary);
    }

    function openLocalRecords() {
      game.state = "RECORDS";
      sfx("select");
    }

    function stageDef() {
      return stages[game.stageIndex];
    }

    function difficultyScale() {
      return 1 + (game.loop - 1) * 0.42;
    }

    function killTarget() {
      return modes.waveTarget(game.mode, stageDef().kills + (game.loop - 1) * 8);
    }

    function newGame() {
      return {
        state: "PLAYING",
        last: performance.now(),
        t: 0,
        fpsTick: performance.now(),
        frames: 0,
        fps: 60,
        slowFrames: 0,

        score: 0,
        highScore: highScore(),
        mode: "classic",
        trainingRounds: 0,
        resultGrade: null,
        newBadges: [],
        combat: combatRules.createState(),
        missileSequence: 0,
        enemySequence: 0,
        world: worlds.createState(0),
        firstClearAcknowledged: false,
        stats: {
          kills: 0,
          bossesDefeated: 0,
          trainingResets: 0,
          bombsUsed: 0,
          maxWeaponLevel: 1,
          damageTaken: 0,
          reachedLoop: 1,
          reachedStage: 1
        },

        stageIndex: 0,
        loop: 1,
        stageMode: "WAVE",
        waveKills: 0,
        nextGuaranteedP: 6,
        spawnTimer: 1.1,
        formationTimer: 5.0,
        transition: 0,
        transitionText: "",
        stageIntro: 2.4,
        rewardTimer: 0,
        pendingStageAdvance: null,

        hp: selectedShip().hpStart,
        hpMax: selectedShip().hpMax,
        bomb: 2,
        bombMax: 3,
        bombFlash: 0,
        weaponType: "blue",
        weaponLevel: 1,
        weaponMax: 3,

        shake: 0,
        fireCooldown: 0,
        invuln: 0,
        message: "",
        messageTimer: 0,

        player: { x: 175, y: H / 2, vx: 0, vy: 0, shipId: selectedShip().id },
        bullets: [],
        missiles: [],
        enemyBullets: [],
        enemies: [],
        powerups: [],
        particles: [],
        boss: null,

        stars: Array.from({ length: 110 }, () => ({
          x: rand(0, W),
          y: rand(0, H),
          z: rand(0.35, 2.2)
        }))
      };
    }

    let game = newGame();
    game.state = "TITLE";
    let performanceOverlay = false;

    // Keep the original 4:3 playfield; letterbox instead of stretching on wide screens.
    function layoutCanvas() {
      platform.fitCanvas(canvas, W, H, window.innerWidth, window.innerHeight);
    }
    layoutCanvas();
    window.addEventListener("resize", layoutCanvas);
    if (window.visualViewport?.addEventListener) {
      window.visualViewport.addEventListener("resize", layoutCanvas);
    }

    function rect(x, y, w, h, c) {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    }

    function poly(points, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
      ctx.closePath();
      ctx.fill();
    }

    function drawText(text, x, y, size = 28, align = "left", color = "#e7fbff") {
      ctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.shadowColor = "#38d5ff";
      ctx.shadowBlur = 8;
      ctx.fillText(text, x, y);
      ctx.shadowBlur = 0;
    }

    function showMessage(text, time = 1.4) {
      game.message = text;
      game.messageTimer = time;
    }

    function announceDriveReady(ready) {
      if (!ready) return;
      sfx("overdriveReady");
      showMessage("OVERDRIVE READY  Y / C", 1.6);
    }

    function activateOverdrive() {
      if (game.state !== "PLAYING" || (game.stageMode !== "WAVE" && game.stageMode !== "BOSS")) return false;
      if (!combatRules.activate(game.combat, selectedShip().id)) return false;
      sfx("overdriveOn");
      haptic("overdrive", 0.55, 0.70, 230, 0.25);
      game.shake = Math.max(game.shake, 14);
      showMessage("NEON OVERDRIVE  ONLINE", 1.4);
      for (let i = 0; i < 44; i++) {
        const a = i / 44 * Math.PI * 2;
        addParticle(game.player.x, game.player.y, Math.cos(a) * rand(110, 280), Math.sin(a) * rand(110, 280), rand(0.32, 0.66), selectedShip().accent);
      }
      return true;
    }

    function awardEnemyKill(e, source = "shot") {
      const rewards = enemyBehaviors.rewardsFor(e);
      const creditSource = rewards.chargeAndCombo ? source : "bomb";
      const result = combatRules.registerKill(game.combat, Math.round(e.score * difficultyScale()), selectedShip().id, creditSource);
      game.score += result.points;
      if (rewards.countsTowardWave) game.waveKills += 1;
      game.stats.kills += 1;
      if (rewards.dropsPowerup) maybeDropPowerup(e);
      announceDriveReady(result.ready);
    }

    function awardBossKill(source = "shot") {
      const base = Math.round((900 + game.stageIndex * 240) * difficultyScale());
      const result = combatRules.registerKill(game.combat, base, selectedShip().id, source);
      game.score += result.points;
      announceDriveReady(result.ready);
    }

    function enterSelect() {
      unlockAudio();
      sfx("confirm");
      game.state = "SELECT";
      showMessage("SELECT FIGHTER", 1.0);
    }

    function startSelectedGame() {
      unlockAudio();
      sfx("confirm");
      game = newGame();
      const setup = modes.initialSetup(
        menu.selectedMode, menu.trainingStage, game.hp, game.hpMax
      );
      game.mode = setup.mode;
      game.stageIndex = setup.stageIndex;
      // spawnBoss only starts from a wave or transition, so prepare before entering BOSS.
      game.stageMode = setup.mode === "bossRush" ? "WAVE" : setup.stageMode;
      game.world = worlds.createState(game.stageIndex);
      game.hp = setup.hp;
      game.bomb = setup.bomb;
      game.weaponLevel = setup.weaponLevel;
      game.weaponType = setup.weaponType;
      game.stats.maxWeaponLevel = setup.weaponLevel;
      game.stats.reachedStage = game.stageIndex + 1;
      game.highScore = modeHighScore(game.mode);
      game.state = "PLAYING";
      if (game.mode === "bossRush") {
        // Boss-only sequence: no wave spawner is ever entered.
        spawnBoss();
      }
      audioEnabled = true;
      startBgm();
      showMessage(`${selectedShip().name} / ${modes.modeById(game.mode).name}`, 1.5);
    }

    function returnToTitle() {
      stopBgm();
      const keepHigh = highScore();
      game = newGame();
      game.state = "TITLE";
      game.highScore = keepHigh;
    }

    function cycleShip(dir) {
      unlockAudio();
      menu.selectedShip = (menu.selectedShip + dir + ships.length) % ships.length;
      sfx("select");
      showMessage(selectedShip().name, 0.8);
    }

    function cycleMode(dir) {
      unlockAudio();
      menu.selectedMode = modes.cycleMode(menu.selectedMode, dir);
      sfx("select");
      showMessage(modes.modeById(menu.selectedMode).name, 0.9);
    }

    function cycleTrainingStage(dir) {
      if (menu.selectedMode !== "training") return;
      menu.trainingStage = modes.cycleStage(menu.trainingStage, dir);
      sfx("select");
      showMessage(stages[menu.trainingStage].short + " PRACTICE", 0.9);
    }

    async function toggleFullscreen() {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          showMessage("FULLSCREEN ON");
        } else {
          await document.exitFullscreen();
          showMessage("FULLSCREEN OFF");
        }
      } catch (_) {
        showMessage("FULLSCREEN BLOCKED", 1.6);
      }
    }

    function handleStartButton() {
      if (game.state === "TITLE") enterSelect();
      else if (game.state === "SELECT") startSelectedGame();
      else if (game.state === "PLAYING") pauseGame();
      else if (game.state === "PAUSED") resumeGame();
      else if (game.state === "ENDING") {
        game.state = "PLAYING";
        finishBossReward();
      } else if (game.state === "RECORDS") {
        returnToTitle();
      }
    }

    function gameOver() {
      if (game.state === "GAME_OVER" || game.state === "RUSH_CLEAR") return;
      game.highScore = saveModeHighScore(game.mode, game.score);
      archiveRankedRun(false);
      game.state = "GAME_OVER";
      game.transition = 0;
      game.enemies.length = 0;
      game.enemyBullets.length = 0;
      game.boss = null;
      sfx("gameOver");
      haptic("gameOver", 0.78, 0.70, 300, 0.8);
      showMessage("GAME OVER", 2);
    }

    let activeGamepadIndex = null;
    let gamepadAwaitRelease = false;
    let controllerNotice = "";

    function resetGamepadEdges() {
      for (const key of Object.keys(gamepadEdge)) gamepadEdge[key] = false;
    }

    function readActivePad() {
      if (!navigator.getGamepads) return null;
      let pads;
      try {
        pads = Array.from(navigator.getGamepads() || []).filter(pad => pad && pad.connected !== false);
      } catch (_) {
        return null;
      }
      if (activeGamepadIndex !== null) {
        return pads.find(pad => pad.index === activeGamepadIndex) || null;
      }
      const first = pads[0] || null;
      if (first) activeGamepadIndex = first.index;
      return first;
    }

    function handleControllerLoss() {
      if (activeGamepadIndex === null) return;
      activeGamepadIndex = null;
      gamepadAwaitRelease = true;
      resetGamepadEdges();
      controllerNotice = "CONTROLLER DISCONNECTED - RECONNECT TO CONTINUE";
      pauseForInterruption("CONTROLLER LOST - PAUSED");
      showMessage("CONTROLLER LOST - PAUSED", 2.5);
    }

    function pollGamepadSystemButtons() {
      const pad = readActivePad();
      if (!pad) {
        if (activeGamepadIndex !== null) handleControllerLoss();
        return;
      }

      // When a pad reconnects, held Start/A must be released before any action fires.
      if (gamepadAwaitRelease) {
        if (controller.anyPressed(pad)) return;
        gamepadAwaitRelease = false;
        resetGamepadEdges();
      }

      const startDown = controller.pressed(pad, 9);
      const selectDown = controller.pressed(pad, 8);
      const upDown = controller.pressed(pad, 12) || (pad.axes?.[1] || 0) < -0.45;
      const downDown = controller.pressed(pad, 13) || (pad.axes?.[1] || 0) > 0.45;
      const leftDown = controller.pressed(pad, 14) || (pad.axes?.[0] || 0) < -0.45;
      const rightDown = controller.pressed(pad, 15) || (pad.axes?.[0] || 0) > 0.45;
      const aDown = controller.pressed(pad, 0);
      const bDown = controller.pressed(pad, 1);
      const xDown = controller.pressed(pad, 2);
      const lbDown = controller.pressed(pad, 4);
      const rbDown = controller.pressed(pad, 5);
      const bombDown = controller.pressed(pad, settings.bombButton);
      const overdriveDown = controller.pressed(pad, settings.overdriveButton);
      const anyDown = controller.anyPressed(pad);

      if (anyDown && !gamepadEdge.any) unlockAudio();

      if ((game.state === "GAME_OVER" || game.state === "RUSH_CLEAR" || game.state === "RECORDS") &&
          startDown && !gamepadEdge.start) {
        returnToTitle();
      } else if (game.state === "PAUSED") {
        if (startDown && !gamepadEdge.start) resumeGame();
        if (selectDown && !gamepadEdge.select) toggleFullscreen();

        if (upDown && !gamepadEdge.up) pauseMenuMove(-1);
        if (downDown && !gamepadEdge.down) pauseMenuMove(1);
        if (leftDown && !gamepadEdge.left) adjustPauseItem(-1);
        if (rightDown && !gamepadEdge.right) adjustPauseItem(1);
        // Physical B always confirms menus, irrespective of combat remapping.
        if (bDown && !gamepadEdge.b) activatePauseItem();
      } else {
        // Physical X opens the local hangar from the title, without entering combat.
        if (game.state === "TITLE" && xDown && !gamepadEdge.x) openLocalRecords();
        // Start / Select remain system keys. Combat fire and bomb are configurable.
        if (startDown && !gamepadEdge.start) handleStartButton();
        if (selectDown && !gamepadEdge.select) toggleFullscreen();
        if (game.state === "PLAYING" && bombDown && !gamepadEdge.bomb) useBomb();
        if (game.state === "PLAYING" && overdriveDown && !gamepadEdge.overdrive) activateOverdrive();

        if (game.state === "SELECT") {
          if (leftDown && !gamepadEdge.left) cycleShip(-1);
          if (rightDown && !gamepadEdge.right) cycleShip(1);
          if (upDown && !gamepadEdge.up) cycleMode(-1);
          if (downDown && !gamepadEdge.down) cycleMode(1);
          if (lbDown && !gamepadEdge.lb) cycleTrainingStage(-1);
          if (rbDown && !gamepadEdge.rb) cycleTrainingStage(1);
        }
      }

      gamepadEdge.start = startDown;
      gamepadEdge.select = selectDown;
      gamepadEdge.up = upDown;
      gamepadEdge.down = downDown;
      gamepadEdge.left = leftDown;
      gamepadEdge.right = rightDown;
      gamepadEdge.lb = lbDown;
      gamepadEdge.rb = rbDown;
      gamepadEdge.x = xDown;
      gamepadEdge.a = aDown;
      gamepadEdge.b = bDown;
      gamepadEdge.bomb = bombDown;
      gamepadEdge.overdrive = overdriveDown;
      gamepadEdge.any = anyDown;
    }

    function drawFalconShip(x, y, tilt = 0, invuln = false, ship = ships[0]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt * 0.05);
      if (invuln) ctx.globalAlpha = 0.55 + Math.sin(Date.now() / 65) * 0.25;

      rect(-50, 25, 104, 8, "rgba(0,0,0,.20)");

      poly([[-70,-12], [18,-18], [66,0], [18,18], [-70,12]], ship.core);
      poly([[-68,-10], [-38,-10], [-50,-30], [-82,-24]], "#6cecff");
      poly([[-68,10], [-38,10], [-50,30], [-82,24]], "#6cecff");
      poly([[-10,-15], [18,-48], [34,-43], [16,-10]], ship.accent);
      poly([[-10,15], [18,48], [34,43], [16,10]], ship.accent);

      poly([[12,-16], [60,-5], [70,0], [60,5], [12,16]], "#f7ffff");
      rect(-5, -24, 31, 11, "#86ecff");
      rect(6, -21, 16, 8, "#153b5b");
      rect(9, -18, 9, 4, "#a6f5ff");

      rect(-25, -7, 36, 5, "#45dfff");
      rect(-25, 2, 36, 5, "#45dfff");
      rect(54, -3, 14, 6, "#203148");

      const flame = Math.sin(game.t * 22) * 4;
      rect(-82, -8, 14, 16, "#24354c");
      rect(-92, -6, 12 + flame, 12, "#ff8f5f");
      rect(-101, -3, 12 + flame, 6, "#ffe07b");

      ctx.restore();
    }

    function drawVanguardShip(x, y, tilt = 0, invuln = false, ship = ships[1]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt * 0.04);
      if (invuln) ctx.globalAlpha = 0.55 + Math.sin(Date.now() / 65) * 0.25;

      rect(-60, 30, 122, 9, "rgba(0,0,0,.22)");

      poly([[-82,-16], [16,-22], [74,0], [16,22], [-82,16]], "#fff0b2");
      poly([[-62,-15], [-24,-18], [-42,-42], [-84,-34]], "#ffd76b");
      poly([[-62,15], [-24,18], [-42,42], [-84,34]], "#ffd76b");
      poly([[-6,-16], [18,-54], [42,-48], [22,-12]], "#cf9441");
      poly([[-6,16], [18,54], [42,48], [22,12]], "#cf9441");

      poly([[18,-18], [72,-6], [84,0], [72,6], [18,18]], "#fff8d1");
      rect(-4, -28, 30, 12, ship.accent);
      rect(5, -24, 18, 8, "#4b3821");
      rect(9, -21, 10, 4, "#fff4b7");

      rect(12, -26, 14, 8, "#33251a");
      rect(12, 18, 14, 8, "#33251a");
      rect(26, -25, 10, 4, "#ffe083");
      rect(26, 22, 10, 4, "#ffe083");

      rect(-92, -11, 16, 9, "#33251a");
      rect(-92, 2, 16, 9, "#33251a");

      const flame = Math.sin(game.t * 18) * 5;
      rect(-105, -10, 16 + flame, 8, "#ff6b5a");
      rect(-105, 2, 16 + flame, 8, "#ff6b5a");
      rect(-115, -8, 12 + flame, 4, "#ffe083");
      rect(-115, 4, 12 + flame, 4, "#ffe083");

      ctx.restore();
    }

    function drawPlayerShip(x, y, tilt = 0, invuln = false, ship = selectedShip()) {
      if (ship.id === "vanguard") drawVanguardShip(x, y, tilt, invuln, ship);
      else drawFalconShip(x, y, tilt, invuln, ship);
    }

    function enemyStats(kind) {
      const s = {
        scout:   { hp: 2, r: 28, vx: -315, color: "#ff8aa7", core: "#ffd2de", shoot: 1.45, score: 30 },
        gunner:  { hp: 3, r: 32, vx: -250, color: "#ff7ca4", core: "#fff0ad", shoot: 1.20, score: 38 },
        zigzag:  { hp: 2, r: 29, vx: -340, color: "#ffb15f", core: "#fff0b2", shoot: 1.35, score: 35 },
        bomber:  { hp: 6, r: 43, vx: -190, color: "#c97a41", core: "#ffd76b", shoot: 1.85, score: 65 },
        sniper:  { hp: 4, r: 31, vx: -230, color: "#9befff", core: "#e8fdff", shoot: 1.55, score: 50 },
        shield:  { hp: 6, r: 39, vx: -205, color: "#70b8ff", core: "#d8fbff", shoot: 1.65, score: 62 },
        drone:   { hp: 3, r: 28, vx: -285, color: "#55eaff", core: "#ffffff", shoot: 1.25, score: 42 },
        orb:     { hp: 3, r: 30, vx: -270, color: "#69ff8f", core: "#eaffef", shoot: 1.22, score: 42 },
        splitter:{ hp: 5, r: 36, vx: -235, color: "#8affbd", core: "#f1fff5", shoot: 1.48, score: 56 },
        elite:   { hp: 7, r: 38, vx: -250, color: "#c084ff", core: "#f3d7ff", shoot: 1.04, score: 75 },
        carrier: { hp: 9, r: 50, vx: -185, color: "#9c67ff", core: "#fff4b7", shoot: 1.65, score: 95 }
      }[kind];

      const d = difficultyScale();
      return {
        ...s,
        hp: Math.ceil(s.hp * (d + game.stageIndex * 0.06)),
        vx: s.vx * (1 + (game.loop - 1) * 0.08),
        shoot: Math.max(0.55, s.shoot - (game.loop - 1) * 0.09)
      };
    }

    function spawnEnemyOfKind(kind, x = W + rand(50, 170), y = rand(90, H - 90), extra = {}) {
      if (game.enemies.length >= LIMITS.enemies) return null;
      const s = enemyStats(kind);
      const hp = Math.ceil(s.hp * (extra.hpMul || 1));
      const enemy = enemyBehaviors.initializeEnemy({
        id: ++game.enemySequence,
        kind,
        minion: extra.minion === true,
        parentId: extra.parentId ?? null,
        x,
        y,
        baseY: extra.baseY ?? y,
        vx: extra.vx ?? s.vx,
        vy: extra.vy ?? rand(-40, 40),
        r: Math.max(14, Math.round(s.r * (extra.sizeMul || 1))),
        sizeMul: extra.sizeMul || 1,
        hp,
        maxHp: hp,
        color: s.color,
        core: s.core,
        shootCd: extra.shootCd ?? rand(0.55, s.shoot),
        shootBase: s.shoot,
        score: Math.round(s.score * (extra.scoreMul || 1)),
        wave: extra.wave ?? rand(0, Math.PI * 2),
        t: rand(0, 5)
      });
      game.enemies.push(enemy);
      return enemy;
    }

    function spawnMinionDrone(x, y, parentId = null) {
      return spawnEnemyOfKind("drone", x, clamp(y, 74, H - 74), {
        minion: true,
        parentId,
        sizeMul: 0.72,
        hpMul: 0.60,
        scoreMul: 0.28,
        vx: -365,
        vy: rand(-50, 50),
        shootCd: 1.1
      });
    }

    function spawnFormation() {
      if (game.stageMode !== "WAVE") return;

      const st = stageDef();
      const laneYs = [170, 300, 430, 560, 690, 820].filter(y => y < H - 80);
      const type = (game.stageIndex + game.loop + Math.floor(game.t / 7)) % 5;

      if (type === 0) {
        // V-shaped fast wave.
        const kind = st.enemies.includes("zigzag") ? "zigzag" : "scout";
        for (let i = 0; i < 5; i++) {
          spawnEnemyOfKind(kind, W + 80 + i * 58, H / 2 + (i - 2) * 72, { shootCd: 1.25 + i * 0.08 });
        }
        showMessage("ENEMY FORMATION", 0.75);
      } else if (type === 1) {
        // Two vertical lanes.
        const kind = st.enemies.includes("drone") ? "drone" : pick(st.enemies);
        for (let i = 0; i < 4; i++) {
          spawnEnemyOfKind(kind, W + 80 + i * 80, 210 + i * 120, { shootCd: 0.9 + i * 0.08 });
        }
      } else if (type === 2) {
        // Heavy escorted by small units.
        const heavy = st.enemies.includes("carrier") ? "carrier" : st.enemies.includes("bomber") ? "bomber" : st.enemies.includes("shield") ? "shield" : "gunner";
        spawnEnemyOfKind(heavy, W + 170, H / 2, { hpMul: 1.15, scoreMul: 1.25, shootCd: 0.7 });
        spawnEnemyOfKind(pick(st.enemies), W + 70, H / 2 - 120, { shootCd: 1.1 });
        spawnEnemyOfKind(pick(st.enemies), W + 70, H / 2 + 120, { shootCd: 1.1 });
      } else if (type === 3) {
        // Stair-step wave.
        const kind = st.enemies.includes("sniper") ? "sniper" : pick(st.enemies);
        for (let i = 0; i < 5; i++) {
          spawnEnemyOfKind(kind, W + 90 + i * 74, laneYs[i % laneYs.length], { shootCd: 1.0 + i * 0.06 });
        }
      } else {
        // Reward carrier chance.
        const kind = st.enemies.includes("carrier") ? "carrier" : st.enemies.includes("bomber") ? "bomber" : st.enemies.includes("shield") ? "shield" : "gunner";
        spawnEnemyOfKind(kind, W + 150, rand(180, H - 180), { hpMul: 0.85, scoreMul: 1.4, shootCd: 0.8 });
      }
    }

    function spawnEnemy() {
      const kind = pick(stageDef().enemies);
      spawnEnemyOfKind(kind);
    }

    function drawEnemy(e) {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.minion) ctx.scale(e.sizeMul || 0.72, e.sizeMul || 0.72);

      if (e.kind === "bomber" || e.kind === "carrier") {
        poly([[-58,-22], [30,-28], [62,0], [30,28], [-58,22]], e.color);
        poly([[-32,-18], [16,-44], [38,-36], [22,-12]], e.core);
        poly([[-32,18], [16,44], [38,36], [22,12]], e.core);
        rect(-8, -12, 28, 24, "#201436");
        rect(6, -7, 12, 14, "#fff0ad");
        rect(-70, -8, 16, 16, "#3b2440");
      } else if (e.kind === "shield") {
        poly([[-40,-28], [28,-28], [50,0], [28,28], [-40,28], [-58,0]], e.color);
        rect(-24, -18, 46, 36, "#112747");
        rect(-12, -10, 24, 20, e.core);
        rect(36, -5, 12, 10, "#ffffff");
      } else if (e.kind === "orb" || e.kind === "splitter") {
        rect(-28, -28, 56, 56, e.color);
        rect(-18, -18, 36, 36, "#0b2318");
        rect(-9, -9, 18, 18, e.core);
        rect(26, -4, 14, 8, e.core);
      } else if (e.kind === "sniper" || e.kind === "elite") {
        poly([[-48,-18], [16,-24], [52,0], [16,24], [-48,18]], e.color);
        rect(-18, -12, 32, 24, "#171f36");
        rect(6, -6, 14, 12, e.core);
        rect(42, -3, 18, 6, "#ffffff");
        rect(-58, -5, 12, 10, "#27304c");
      } else {
        poly([[-42,-18], [20,-20], [48,0], [20,20], [-42,18]], e.color);
        rect(-16, -11, 26, 22, "#201436");
        rect(-6, -5, 12, 10, e.core);
        rect(-52, -5, 12, 10, "#3b2440");
      }

      if (e.kind === "shield" && e.shieldHp > 0) {
        // Shield blocks fire coming from the left; an arc makes the protected side legible.
        ctx.save();
        ctx.globalAlpha = 0.38 + 0.42 * e.shieldHp / e.shieldMax;
        ctx.strokeStyle = "#8ef7ff";
        ctx.shadowColor = "#8ef7ff";
        ctx.shadowBlur = 15;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, e.r + 14, Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();
        ctx.restore();
      }
      if (e.kind === "splitter" && !e.minion) {
        ctx.fillStyle = "#eaffef";
        ctx.fillRect(-22, -22, 11, 11);
        ctx.fillRect(12, 12, 11, 11);
      }
      if (e.kind === "carrier" && e.launchedEscorts < enemyBehaviors.CONFIG.carrierMaxLaunches && e.launchCooldown < 0.75) {
        ctx.save();
        ctx.globalAlpha = 0.56 + Math.sin(game.t * 16) * 0.35;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#fff4b7";
        ctx.fillStyle = "#fff4b7";
        ctx.fillRect(-20, -17, 40, 34);
        ctx.restore();
      }

      ctx.restore();
    }

    function aimAtPlayer(fromX, fromY, speed, r, color, glow, spread = 0) {
      if (game.enemyBullets.length >= LIMITS.enemyBullets) return;
      const dx = game.player.x - fromX;
      const dy = game.player.y - fromY;
      const base = Math.atan2(dy, dx) + spread;
      game.enemyBullets.push({
        x: fromX,
        y: fromY,
        vx: Math.cos(base) * speed,
        vy: Math.sin(base) * speed,
        r,
        life: 6,
        c: color,
        glow
      });
    }

    function fireEnemy(e) {
      const d = difficultyScale();
      const speed = (e.kind === "sniper" || e.kind === "elite") ? 430 + d * 28 : 310 + d * 25;
      const sx = e.x - e.r * 0.6;
      const sy = e.y;

      if (e.kind === "gunner" || e.kind === "elite") {
        aimAtPlayer(sx, sy, speed, 8, e.color, e.core, -0.12);
        aimAtPlayer(sx, sy, speed, 8, e.color, e.core, 0.12);
      } else if (e.kind === "bomber" || e.kind === "carrier") {
        aimAtPlayer(sx, sy, speed * 0.82, 11, e.color, e.core, -0.18);
        aimAtPlayer(sx, sy, speed * 0.82, 11, e.color, e.core, 0);
        aimAtPlayer(sx, sy, speed * 0.82, 11, e.color, e.core, 0.18);
      } else if (e.kind === "splitter" || e.kind === "orb") {
        for (const a of [-0.30, -0.10, 0.10, 0.30]) aimAtPlayer(sx, sy, speed * 0.9, 8, e.color, e.core, a);
      } else {
        aimAtPlayer(sx, sy, speed, 8, e.color, e.core, 0);
      }
    }

    function updateEnemies(dt) {
      // Newly-launched minions join the next frame, not this frame's iteration.
      const initialCount = game.enemies.length;
      for (let i = 0; i < initialCount; i++) {
        const e = game.enemies[i];
        if (!e || e.hp <= 0) continue;
        e.t += dt;
        e.x += e.vx * dt;

        if (e.kind === "zigzag") {
          e.y = e.baseY + Math.sin(e.t * 5.2 + e.wave) * 120;
        } else if (e.kind === "orb" || e.kind === "splitter") {
          e.y += (Math.sin(e.t * 4 + e.wave) * 75) * dt;
        } else if (e.kind === "sniper" || e.kind === "shield") {
          e.y += (e.vy + Math.sin(e.t * 2.8 + e.wave) * 26) * dt;
        } else {
          e.y += (e.vy + Math.sin(e.t * 3.8 + e.wave) * 38) * dt;
        }

        if (e.y < 70 || e.y > H - 70) e.vy *= -1;

        if (e.kind === "carrier" && e.x < W - 120 && e.x > 110) {
          const escortCount = game.enemies.reduce(
            (count, other) => count + (other.hp > 0 && other.parentId === e.id ? 1 : 0), 0
          );
          const launched = enemyBehaviors.maybeLaunchEscort(
            e, game.stageMode, escortCount, LIMITS.enemies - game.enemies.length, dt
          );
          if (launched) {
            const shift = e.launchedEscorts % 2 ? -54 : 54;
            spawnMinionDrone(e.x - 46, e.y + shift, e.id);
            showMessage("CARRIER DEPLOYED DRONE", 0.8);
          }
        }

        if (e.x < W - 80 && e.x > 80) {
          e.shootCd -= dt;
          if (e.shootCd <= 0) {
            fireEnemy(e);
            e.shootCd = e.shootBase * rand(0.75, 1.18);
          }
        }
      }

      game.enemies = game.enemies.filter(e => e.hp > 0 && e.x > -120);
    }

    function randomPowerType() {
      const r = Math.random();
      if (r < 0.34) return "P_BLUE";
      if (r < 0.67) return "P_PURPLE";
      return "P_YELLOW";
    }

    function weaponMeta(type = game.weaponType) {
      if (type === "purple") return { name: "SPREAD", short: "PURPLE", color: "#c084ff", core: "#f3d7ff" };
      if (type === "yellow") return { name: "MISSILE", short: "YELLOW", color: "#ffd76b", core: "#fff4b7" };
      return { name: "LINE", short: "BLUE", color: "#38e8ff", core: "#e8fdff" };
    }

    function powerupWeaponType(powerupType) {
      if (powerupType === "P_PURPLE") return "purple";
      if (powerupType === "P_YELLOW") return "yellow";
      return "blue";
    }

    function currentPowerupType() {
      if (game.weaponType === "purple") return "P_PURPLE";
      if (game.weaponType === "yellow") return "P_YELLOW";
      return "P_BLUE";
    }

    function dropPlayerPowerOnHit() {
      if (game.weaponLevel <= 1) return;

      const droppedType = currentPowerupType();
      game.weaponLevel = Math.max(1, game.weaponLevel - 1);

      // Drop slightly in front of the player so it is recoverable but not instantly re-collected.
      spawnPowerup(
        clamp(game.player.x + 120, 160, W - 180),
        clamp(game.player.y + rand(-28, 28), 80, H - 80),
        droppedType
      );

      const p = game.powerups[game.powerups.length - 1];
      if (p) {
        p.vx = -62;
        p.vy = rand(-35, 35);
        p.safeTimer = 0.45;
      }

      showMessage("POWER DOWN  RECOVER P!", 1.15);
    }

    function spawnPowerup(x, y, forcedType = null) {
      const type = forcedType || (Math.random() < 0.38 ? "HP" : randomPowerType());
      // v13: items no longer disappear because of a short timer while still visible.
      // They persist until they fully leave the left side of the playfield.
      game.powerups.push({ x, y, type, vx: -118, vy: rand(-22, 22), r: 24, t: rand(0, Math.PI * 2), life: 30, safeTimer: 0 });
    }

    function maybeDropPowerup(e) {
      // v19 tuning:
      // BOMB is now a collectible item like P / +HP.
      // It has a low normal drop rate, while every Boss is guaranteed to drop one.
      const isHeavy = e.kind === "carrier" || e.kind === "bomber" || e.kind === "elite" || e.kind === "shield";
      const stageBonus = game.stageIndex * 0.015;
      const loopPenalty = Math.min(0.05, (game.loop - 1) * 0.015);
      const dropChance = (isHeavy ? 0.42 : 0.22) + stageBonus - loopPenalty;

      const shouldGuaranteeP =
        game.stageMode === "WAVE" &&
        game.weaponLevel < game.weaponMax &&
        game.waveKills >= game.nextGuaranteedP;

      if (!shouldGuaranteeP && Math.random() > dropChance) return;

      let type;

      if (shouldGuaranteeP) {
        type = randomPowerType();
        game.nextGuaranteedP += 9 + game.stageIndex * 2;
      } else if (game.hp <= 1 && Math.random() < 0.60) {
        type = "HP";
      } else {
        // Low but visible Bomb chance. Heavy enemies are more likely to drop it.
        const bombChance = game.bomb < game.bombMax ? (isHeavy ? 0.12 : 0.055) : 0.015;

        if (Math.random() < bombChance) {
          type = "BOMB";
        } else if (game.hp < game.hpMax && Math.random() < 0.25) {
          type = "HP";
        } else {
          const pChance = game.weaponLevel < game.weaponMax ? 0.50 : 0.26;
          type = Math.random() < pChance ? randomPowerType() : "HP";
        }
      }

      spawnPowerup(e.x, e.y, type);
    }

    function collectPowerup(p) {
      p.life = 0;

      if (p.type.startsWith("P_")) {
        sfx("pickupP");
        hapticPickup();

        const nextType = powerupWeaponType(p.type);
        game.weaponType = nextType;

        if (game.weaponLevel < game.weaponMax) {
          game.weaponLevel += 1;
          game.stats.maxWeaponLevel = Math.max(game.stats.maxWeaponLevel, game.weaponLevel);
          game.score += 100;
        } else {
          game.score += 250;
        }

        const meta = weaponMeta(nextType);
        showMessage(`${meta.short} P  ${meta.name}  LV.${game.weaponLevel}`, 1.25);
        for (let i = 0; i < 30; i++) addParticle(p.x, p.y, rand(-190, 190), rand(-190, 190), rand(0.22, 0.60), i % 2 ? meta.color : meta.core);
      } else if (p.type === "BOMB") {
        sfx("pickupP");
        hapticPickup();

        if (game.bomb < game.bombMax) {
          game.bomb += 1;
          game.score += 150;
          showMessage(`BOMB +1  ${game.bomb}/${game.bombMax}`, 1.25);
        } else {
          game.score += 350;
          showMessage("BOMB FULL  +350", 1.1);
        }

        for (let i = 0; i < 36; i++) {
          addParticle(
            p.x,
            p.y,
            rand(-210, 210),
            rand(-210, 210),
            rand(0.24, 0.68),
            i % 3 === 0 ? "#8ef7ff" : i % 3 === 1 ? "#ffffff" : "#fff4b7"
          );
        }
      } else {
        sfx("pickupHp");
        hapticPickup();

        if (game.hp < game.hpMax) {
          game.hp += 1;
          game.score += 75;
          showMessage(`+HP  ${game.hp}/${game.hpMax}`, 1.2);
        } else {
          game.score += 200;
          showMessage("HP FULL  +200", 1.1);
        }

        for (let i = 0; i < 28; i++) addParticle(p.x, p.y, rand(-180, 180), rand(-180, 180), rand(0.2, 0.58), i % 2 ? "#ff4f5e" : "#ffe3e7");
      }
    }

    function updatePowerups(dt) {
      for (const p of game.powerups) {
        p.t += dt * 6;
        p.x += p.vx * dt;
        p.y += (p.vy + Math.sin(p.t) * 18) * dt;
        p.life -= dt;
        p.safeTimer = Math.max(0, (p.safeTimer || 0) - dt);

        if (p.y < 54 || p.y > H - 54) p.vy *= -1;
        if ((p.safeTimer || 0) <= 0 && dist(game.player.x, game.player.y, p.x, p.y) < p.r + selectedShip().hitbox + 8) collectPowerup(p);
      }

      // Remove only after the whole pickup sprite has safely moved beyond the left edge.
      game.powerups = game.powerups.filter(p => p.life > 0 && p.x > -96 && p.y > -96 && p.y < H + 96);
    }

    function drawPowerups() {
      for (const p of game.powerups) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(p.t) * 0.10);

        const pulse = 1 + Math.sin(p.t * 1.6) * 0.08;
        ctx.scale(pulse, pulse);

        if (p.type.startsWith("P_")) {
          const wt = powerupWeaponType(p.type);
          const meta = weaponMeta(wt);
          rect(-23, -23, 46, 46, "#07111f");
          rect(-19, -19, 38, 38, meta.color);
          rect(-13, -13, 26, 26, "#081020");
          drawText("P", 0, 1, 28, "center", meta.core);
          rect(-29, -4, 6, 8, meta.core);
          rect(23, -4, 6, 8, meta.core);
          if (wt === "purple") {
            rect(-4, -29, 8, 6, meta.core);
            rect(-4, 23, 8, 6, meta.core);
          } else if (wt === "yellow") {
            rect(-8, -29, 6, 6, meta.core);
            rect(2, -29, 6, 6, meta.core);
            rect(-8, 23, 6, 6, meta.core);
            rect(2, 23, 6, 6, meta.core);
          }
        } else if (p.type === "BOMB") {
          // Cyan-white bomb pickup.
          rect(-25, -25, 50, 50, "#061826");
          rect(-21, -21, 42, 42, "#8ef7ff");
          rect(-15, -15, 30, 30, "#07111f");

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.stroke();

          rect(-3, -22, 6, 10, "#fff4b7");
          rect(-22, -3, 10, 6, "#fff4b7");
          rect(12, -3, 10, 6, "#fff4b7");
          drawText("B", 0, 2, 20, "center", "#ffffff");
        } else {
          rect(-23, -23, 46, 46, "#2a0710");
          rect(-19, -19, 38, 38, "#ff4f5e");
          rect(-13, -5, 26, 10, "#ffffff");
          rect(-5, -13, 10, 26, "#ffffff");
          rect(-27, -4, 6, 8, "#ffe3e7");
          rect(21, -4, 6, 8, "#ffe3e7");
        }

        ctx.restore();
      }
    }

    function addParticle(x, y, vx, vy, life, c) {
      if (game.particles.length >= LIMITS.particles) return;
      game.particles.push({ x, y, vx, vy, life, c });
    }

    function updateParticles(dt) {
      for (const p of game.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        p.vx *= 0.985;
        p.vy *= 0.985;
      }
      game.particles = game.particles.filter(p => p.life > 0);
    }

    function drawParticles() {
      for (const p of game.particles) {
        ctx.globalAlpha = clamp(p.life * 2.5, 0, 1);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, 6, 6);
        ctx.globalAlpha = 1;
      }
    }

    function addPlayerShot(x, y, vx, vy, r = 8, power = 1, c = "#5ae8ff", extra = {}) {
      if (game.bullets.length >= LIMITS.playerBullets) return;
      game.bullets.push({
        x, y, vx, vy, r,
        power: power * combatRules.weaponDamageScale(game.combat, selectedShip().id),
        c, ...extra
      });
    }

    function addMissile(x, y, vySign = 1, power = 2) {
      if (game.missiles.length >= LIMITS.missiles) return;
      sfx("missile");
      haptic("missile", 0.10, 0.12, 24, 0.12);
      const overdrive = combatRules.isActive(game.combat);
      game.missiles.push({
        x, y, vx: 520, vy: vySign * 160, r: 14,
        power: power * combatRules.weaponDamageScale(game.combat, selectedShip().id),
        life: 4.6, turn: overdrive ? 5.8 : 4.2, trail: 0,
        overdrive, targetSlot: (game.missileSequence++) % 3
      });
    }

    function firePlayerWeapons() {
      sfx("shot");
      hapticShot();
      const level = game.weaponLevel;
      const type = game.weaponType;
      const overdrive = combatRules.isActive(game.combat);
      const muzzleX = game.player.x + 62;
      const baseY = game.player.y;

      if (type === "blue") {
        addPlayerShot(muzzleX, baseY - 10, 1100, 0, 9, 1.15, "#38e8ff");
        addPlayerShot(muzzleX, baseY + 12, 1100, 0, 9, 1.15, "#38e8ff");
        if (level >= 2) addPlayerShot(muzzleX + 8, baseY, 1180, 0, 12, 1.7, "#e8fdff");
        if (level >= 3) {
          addPlayerShot(muzzleX - 4, baseY - 26, 1060, 0, 8, 1, "#8ef7ff");
          addPlayerShot(muzzleX - 4, baseY + 28, 1060, 0, 8, 1, "#8ef7ff");
        }
        if (overdrive) {
          // An extra cyan lance can pierce three distinct enemies, not the same enemy three times.
          addPlayerShot(muzzleX + 8, baseY, 1420, 0, 17, 2.25 + level * 0.25, "#e8fdff",
            { pierce: 3, hitEnemies: [], lance: true });
        }
      } else if (type === "purple") {
        const fan = overdrive
          ? (level === 1 ? [-0.42, -0.21, 0, 0.21, 0.42]
            : level === 2 ? [-0.48, -0.29, -0.1, 0.1, 0.29, 0.48]
            : [-0.58, -0.42, -0.25, -0.08, 0.08, 0.25, 0.42, 0.58])
          : (level === 1 ? [-0.10, 0, 0.10]
            : level === 2 ? [-0.20, -0.09, 0.09, 0.20]
            : [-0.30, -0.18, -0.07, 0.07, 0.18, 0.30]);
        for (const a of fan) addPlayerShot(
          muzzleX, baseY, Math.cos(a) * 960, Math.sin(a) * 960,
          8, level >= 3 ? 1.05 : 0.9, "#c084ff", { pointBlank: overdrive }
        );
      } else {
        addPlayerShot(muzzleX + 4, baseY, 1020, 0, 11, 1.35, "#ffd76b");
        if (level >= 2) {
          addPlayerShot(muzzleX, baseY - 18, 980, 0, 8, 1, "#fff4b7");
          addPlayerShot(muzzleX, baseY + 18, 980, 0, 8, 1, "#fff4b7");
        }
        addMissile(game.player.x + 6, game.player.y - 38, -1, level >= 3 ? 2.6 : 2.0);
        addMissile(game.player.x + 6, game.player.y + 38, 1, level >= 3 ? 2.6 : 2.0);
        if (level >= 3) {
          addMissile(game.player.x - 24, game.player.y - 54, -1, 2.3);
          addMissile(game.player.x - 24, game.player.y + 54, 1, 2.3);
        }
        // Performance cap: extra missiles are reduced when the playfield is already saturated.
        if (overdrive && game.missiles.length < 44) {
          addMissile(game.player.x - 40, game.player.y - 64, -1, 2.4);
          addMissile(game.player.x - 40, game.player.y + 64, 1, 2.4);
        }
      }

      const meta = weaponMeta();
      for (let i = 0; i < 3 + level; i++) addParticle(
        game.player.x - 72, game.player.y + rand(-10, 10), rand(-120, -30), rand(-60, 60),
        0.13, i % 2 ? meta.color : "#fff1a8"
      );
    }

    function getFireCooldown() {
      if (game.weaponType === "yellow") return Math.max(0.17, 0.25 - game.weaponLevel * 0.025);
      if (game.weaponType === "purple") return Math.max(0.10, 0.145 - game.weaponLevel * 0.012);
      return Math.max(0.07, 0.115 - game.weaponLevel * 0.014);
    }

    function findMissileTarget(m) {
      if (m.overdrive && !game.boss && game.enemies.length > 1) {
        // Spread overdrive seekers across the nearest three living targets.
        // Keep a small sorted list to avoid sorting all enemies per missile per frame.
        const closest = [];
        for (const e of game.enemies) {
          if (e.hp <= 0) continue;
          const score = dist(m.x, m.y, e.x, e.y) + (e.x < m.x - 60 ? 1200 : 0);
          let insertAt = 0;
          while (insertAt < closest.length && closest[insertAt].score <= score) insertAt++;
          if (insertAt >= 3) continue;
          closest.splice(insertAt, 0, { enemy: e, score });
          if (closest.length > 3) closest.pop();
        }
        if (closest.length) return closest[m.targetSlot % closest.length].enemy;
      }
      let best = null;
      let bestScore = Infinity;

      if (game.boss) {
        const b = game.boss;
        const d = dist(m.x, m.y, b.x, b.y);
        best = b;
        bestScore = d * 0.75;
      }

      for (const e of game.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - m.x;
        const d = dist(m.x, m.y, e.x, e.y);
        const score = d + (dx < -60 ? 1200 : 0);
        if (score < bestScore) {
          best = e;
          bestScore = score;
        }
      }
      return best;
    }

    function normalizeAngle(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    }

    function damageEnemy(e, amount, x, y, c = "#64f4ff") {
      if (e.hp <= 0) return;

      const shield = enemyBehaviors.applyFrontalShield(e, amount, game.player.x);
      if (shield.absorbed > 0) {
        // The frontal shield loses finite charge, then remaining damage spills into the hull.
        sfx("enemyHit");
        for (let i = 0; i < 8; i++) addParticle(
          e.x - e.r, e.y + rand(-e.r, e.r), rand(-125, 35), rand(-130, 130),
          rand(0.15, 0.44), "#8ef7ff"
        );
        if (shield.broken) {
          sfx("clear");
          showMessage("ENEMY SHIELD BROKEN", 0.8);
        }
      }
      if (shield.hullDamage <= 0) return;

      e.hp -= shield.hullDamage;
      sfx("enemyHit");
      game.shake = Math.max(game.shake, 3);

      for (let i = 0; i < 8; i++) addParticle(x, y, rand(-180, 90), rand(-150, 150), rand(0.18, 0.42), c);

      if (e.hp <= 0) {
        sfx("explode");
        hapticExplosion();
        awardEnemyKill(e);
        game.shake = Math.max(game.shake, 8);

        for (let i = 0; i < 26; i++) addParticle(e.x, e.y, rand(-240, 190), rand(-220, 220), rand(0.25, 0.70), i % 2 ? e.core : e.color);

        // A destroyed parent can split only during waves, not under BOMB or during a Boss fight.
        if (game.stageMode === "WAVE" && game.waveKills < killTarget()) {
          const count = enemyBehaviors.splitterCount(
            e, game.stageMode, LIMITS.enemies - game.enemies.length
          );
          for (let i = 0; i < count; i++) {
            const offset = i === 0 ? -46 : 46;
            spawnMinionDrone(e.x - 8, e.y + offset);
          }
          if (count > 0) showMessage("SPLITTER DEPLOYED MINIONS", 0.9);
        }

        if (game.stageMode === "WAVE" && game.waveKills >= killTarget()) {
          spawnBoss();
        }
      }
    }

    function spawnBoss() {
      if (game.boss || game.stageMode === "BOSS") return;

      const def = stageDef().boss;
      const d = difficultyScale();

      game.stageMode = "BOSS";
      game.spawnTimer = 999;
      game.enemies.length = 0;
      game.enemyBullets.length = Math.min(game.enemyBullets.length, 8);

      startBgm();

      game.boss = {
        ...def,
        x: W + 230,
        y: H / 2,
        targetX: W - 240,
        active: false,
        t: 0,
        hp: Math.ceil(def.hp * d * (1 + game.stageIndex * 0.06)),
        maxHp: Math.ceil(def.hp * d * (1 + game.stageIndex * 0.06)),
        shoot: 1.1,
        phase: 0,
        lastPhase: 0,
        warning: 0
      };
      game.boss.parts = bossParts.createParts(game.boss);

      sfx("boss");
      hapticBoss();
      showMessage(`${def.name}`, 2.0);
    }

    function fireBossBullet(x, y, angle, speed, r, c, glow) {
      if (game.enemyBullets.length >= LIMITS.enemyBullets) return;
      game.enemyBullets.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r,
        life: 7,
        c,
        glow
      });
    }

    function fireBossAimedFan(count, spread, speed, r, color, glow) {
      const b = game.boss;
      const base = Math.atan2(game.player.y - b.y, game.player.x - (b.x - b.rx * 0.7));
      const effectiveCount = bossParts.reducedFanCount(b, count);
      const start = -spread * (effectiveCount - 1) / 2;
      for (let i = 0; i < effectiveCount; i++) {
        fireBossBullet(b.x - b.rx * 0.7, b.y + rand(-24, 24), base + start + spread * i, speed, r, color, glow);
      }
    }

    function updateBoss(dt) {
      const b = game.boss;
      if (!b) return;

      b.t += dt;

      if (!b.active) {
        b.x -= 190 * dt;
        if (b.x <= b.targetX) {
          b.x = b.targetX;
          b.active = true;
          b.shoot = 0.7;
          b.warning = 0;
          showMessage("BOSS ACTIVE", 1.2);
        }
        return;
      }

      const hpRatio = clamp(b.hp / b.maxHp, 0, 1);
      b.phase = hpRatio < 0.15 ? 3 : hpRatio < 0.40 ? 2 : hpRatio < 0.70 ? 1 : 0;

      if (b.phase !== b.lastPhase) {
        b.lastPhase = b.phase;
        game.shake = Math.max(game.shake, 14);
        haptic("bossPhase", 0.55, 0.48, 140, 0.2);
        sfx("boss");
        showMessage(b.phase >= 3 ? "BOSS ENRAGE" : `BOSS PHASE ${b.phase + 1}`, 1.25);
      }

      // Important: once active, Boss is locked into a right-side arena and can never drift off-screen left.
      const phaseBoost = 1 + b.phase * 0.10;
      const ampX = [18, 36, 28, 44, 54][b.pattern] * phaseBoost;
      const ampY = [140, 190, 155, 210, 170][b.pattern] * phaseBoost;
      b.x = clamp(b.targetX + Math.sin(b.t * (0.55 + b.pattern * 0.08 + b.phase * 0.04)) * ampX, W - 390, W - 125);
      b.y = clamp(H / 2 + Math.sin(b.t * (0.85 + b.pattern * 0.06 + b.phase * 0.05)) * ampY, 145, H - 145);

      if (b.warning > 0) {
        b.warning -= dt;

        if (b.warning <= 0) {
          const d = difficultyScale();
          const color = b.color;
          const glow = b.core;
          const extra = b.phase;

          // Telegraph attack: a heavier horizontal blast lane after warning.
          const base = Math.atan2(game.player.y - b.y, game.player.x - (b.x - b.rx));
          for (let i = 0; i < 4 + extra * 2; i++) {
            const spread = (i - (3 + extra * 2) / 2) * 0.045;
            fireBossBullet(b.x - b.rx, b.y + rand(-20, 20), base + spread, 430 + d * 35 + extra * 28, 12, color, glow);
          }

          game.shake = Math.max(game.shake, 10);
        }

        return;
      }

      b.shoot -= dt;
      if (b.shoot > 0) return;

      const d = difficultyScale();
      const color = b.color;
      const glow = b.core;
      const phaseShots = b.phase;
      const phaseSpeed = 1 + b.phase * 0.12;

      // Every few attacks, perform a telegraphed heavy shot.
      if ((Math.floor(b.t * 10) + b.pattern + b.phase) % (5 - Math.min(2, b.phase)) === 0) {
        b.warning = Math.max(0.38, 0.65 - b.phase * 0.08);
        sfx("damage");
        haptic("bossWarn", 0.28, 0.22, 70, 0.15);
        b.shoot = 0.72;
        return;
      }

      if (b.pattern === 0) {
        fireBossAimedFan(3 + Math.min(2, game.loop - 1) + phaseShots, 0.16, (330 + d * 28) * phaseSpeed, 10, color, glow);
        b.shoot = Math.max(0.54, 1.15 - (game.loop - 1) * 0.08 - b.phase * 0.12);
      } else if (b.pattern === 1) {
        fireBossAimedFan(4 + phaseShots, 0.14, (320 + d * 30) * phaseSpeed, 10, color, glow);
        for (const oy of [-80, 0, 80]) fireBossBullet(b.x - b.rx, b.y + oy, Math.PI + Math.sin(b.t) * 0.22, (265 + d * 25) * phaseSpeed, 9, color, glow);
        b.shoot = Math.max(0.58, 1.28 - (game.loop - 1) * 0.08 - b.phase * 0.13);
      } else if (b.pattern === 2) {
        fireBossAimedFan(3 + phaseShots, 0.20, (390 + d * 30) * phaseSpeed, 12, color, glow);
        for (const oy of [-105, -35, 35, 105]) fireBossBullet(b.x - b.rx, b.y + oy, Math.PI, (240 + d * 22) * phaseSpeed, 12, color, glow);
        b.shoot = Math.max(0.62, 1.35 - (game.loop - 1) * 0.08 - b.phase * 0.12);
      } else if (b.pattern === 3) {
        for (let i = 0; i < 8 + phaseShots * 2; i++) {
          const angle = Math.PI + Math.sin(b.t * 1.3) * 0.55 + (i - 3.5 - phaseShots) * 0.16;
          fireBossBullet(b.x - b.rx * 0.7, b.y, angle, (255 + d * 24) * phaseSpeed, 9, color, glow);
        }
        fireBossAimedFan(2 + phaseShots, 0.22, (360 + d * 25) * phaseSpeed, 10, color, glow);
        b.shoot = Math.max(0.50, 1.02 - (game.loop - 1) * 0.07 - b.phase * 0.11);
      } else {
        fireBossAimedFan(5 + phaseShots, 0.13, (385 + d * 32) * phaseSpeed, 10, color, glow);
        for (let i = 0; i < 10 + phaseShots * 2; i++) {
          const angle = Math.PI + (i - 4.5 - phaseShots) * 0.12 + Math.sin(b.t) * 0.18;
          fireBossBullet(b.x - b.rx, b.y + Math.sin(i) * 30, angle, (285 + d * 25) * phaseSpeed, 9, color, glow);
        }
        b.shoot = Math.max(0.46, 0.98 - (game.loop - 1) * 0.07 - b.phase * 0.10);
      }
      // Each destroyed weapon mount materially reduces the Boss attack rate.
      b.shoot *= bossParts.attackDelayMultiplier(b);
    }

    function damageBoss(amount, x, y, color = "#fff1a8", targetPart = null) {
      const boss = game.boss;
      if (!boss || boss.hp <= 0 || !boss.active) return false;

      if (targetPart) {
        const effect = bossParts.damagePart(boss, targetPart, amount);
        if (!effect.hit) return false;
        if (effect.broken) {
          game.shake = Math.max(game.shake, 16);
          game.score += 120 + game.stageIndex * 35;
          sfx("explode");
          haptic("bossPart", 0.55, 0.4, 120, 0.25);
          showMessage(targetPart.id + " DESTROYED - BOSS WEAKENED", 1.5);
          for (let i = 0; i < 35; i++) addParticle(
            boss.x + targetPart.x, boss.y + targetPart.y,
            rand(-240, 175), rand(-220, 220), rand(0.24, 0.65),
            i % 2 ? "#fff4b7" : boss.color
          );
        } else {
          for (let i = 0; i < 5; i++) addParticle(
            boss.x + targetPart.x, boss.y + targetPart.y,
            rand(-100, 65), rand(-105, 105), rand(0.10, 0.28), "#8ef7ff"
          );
        }
      } else {
        boss.hp -= amount;
        game.shake = Math.max(game.shake, 4);
        for (let i = 0; i < 10; i++) addParticle(
          x, y, rand(-180, 90), rand(-150, 150), rand(0.16, 0.38),
          i % 2 ? color : boss.color
        );
      }

      if (boss.hp <= 0) {
        awardBossKill();
        sfx("explode");
        haptic("bossDead", 1.0, 0.85, 360, 0.6);
        killBoss();
      }
      return true;
    }

    function killBoss() {
      const b = game.boss;
      if (!b) return;

      for (let i = 0; i < 90; i++) addParticle(b.x + rand(-b.rx, b.rx), b.y + rand(-b.ry, b.ry), rand(-320, 240), rand(-270, 270), rand(0.35, 1.05), i % 2 ? b.core : b.color);

      game.shake = 22;
      game.boss = null;
      game.enemyBullets.length = 0;
      game.bullets.length = 0;
      game.missiles.length = 0;
      game.powerups.length = 0;
      game.world.phase = "idle";
      game.world.hazard = null;

      // Every Boss guarantees one collectible Bomb item.
      // It appears in the active play area and drifts left like P / +HP.
      spawnPowerup(W - 300, H / 2, "BOMB");

      game.stats.bossesDefeated += 1;
      const next = modes.nextAfterBoss(
        game.mode, game.stageIndex, game.loop, stages.length, menu.trainingStage
      );
      game.pendingStageAdvance = next;
      if (game.mode === "classic") {
        // Keep original classic stage banner wording.
        game.pendingStageAdvance.text = next.stageIndex === 0
          ? `5 STAGES CLEAR  /  LOOP ${next.loop} START`
          : `STAGE CLEAR  /  NEXT: ${stages[next.stageIndex].short}`;
      }

      game.stageMode = "BOSS_REWARD";
      game.rewardTimer = 4.2;
      game.spawnTimer = 999;
      game.waveKills = 0;
      game.stageIntro = 0;

      sfx("clear");
      hapticClear();
      showMessage("BOSS CLEAR  GET BOMB", 2.2);
    }

    function drawBossWarning(b) {
      if (!b || !b.active || !b.warning || b.warning <= 0) return;

      const a = clamp(b.warning / 0.65, 0, 1);

      ctx.save();
      ctx.globalAlpha = 0.38 + 0.35 * Math.sin(game.t * 28);
      ctx.fillStyle = `rgba(255, 88, 105, ${0.22 + 0.18 * a})`;
      ctx.fillRect(0, b.y - 22, W, 44);

      ctx.strokeStyle = `rgba(255, 244, 183, ${0.75})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(b.x - b.rx - 18, b.y);
      ctx.lineTo(56, b.y);
      ctx.stroke();

      ctx.restore();

      drawText("WARNING", 96, b.y - 42, 24, "left", "#ff8aa7");
    }

    function drawBoss(b) {
      if (!b) return;

      ctx.save();
      ctx.translate(b.x, b.y);

      if (b.pattern === 0) {
        poly([[-100,-48], [36,-62], [108,0], [36,62], [-100,48]], b.color);
        rect(-60, -30, 82, 60, "#201436");
        rect(8, -16, 38, 32, b.core);
        rect(-122, -12, 24, 24, "#3b2440");
      } else if (b.pattern === 1) {
        poly([[-120,-32], [-30,-70], [95,-22], [118,0], [95,22], [-30,70], [-120,32]], b.color);
        rect(-62, -24, 90, 48, "#2d1712");
        rect(20, -10, 40, 20, b.core);
        rect(-138, -8, 22, 16, "#4d241b");
      } else if (b.pattern === 2) {
        poly([[-132,-58], [48,-70], [118,-20], [132,0], [118,20], [48,70], [-132,58]], b.color);
        rect(-74, -34, 110, 68, "#102747");
        rect(-24, -18, 50, 36, b.core);
        rect(100, -7, 30, 14, "#ffffff");
      } else if (b.pattern === 3) {
        poly([[-105,-78], [22,-58], [105,0], [22,58], [-105,78], [-68,0]], b.color);
        rect(-70, -38, 92, 76, "#0b2318");
        rect(-18, -18, 36, 36, b.core);
        rect(74, -8, 28, 16, "#eaffef");
      } else {
        poly([[-150,-78], [20,-96], [150,-24], [162,0], [150,24], [20,96], [-150,78]], b.color);
        rect(-102, -50, 126, 100, "#1c1030");
        rect(-44, -24, 64, 48, b.core);
        rect(132, -10, 34, 20, "#fff4b7");
        rect(-170, -18, 28, 36, "#2b164d");
      }

      // Two visible, player-facing weapon mounts. Their destruction changes the attack pattern.
      for (const part of b.parts || []) {
        ctx.save();
        ctx.translate(part.x, part.y);
        if (part.hp > 0) {
          const hpRatio = clamp(part.hp / part.maxHp, 0, 1);
          ctx.globalAlpha = 0.72 + Math.sin(game.t * 14) * 0.12;
          ctx.fillStyle = "#182c48";
          ctx.strokeStyle = "#8ef7ff";
          ctx.lineWidth = 4;
          ctx.shadowColor = "#8ef7ff";
          ctx.shadowBlur = 13;
          ctx.beginPath();
          ctx.arc(0, 0, part.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#fff4b7";
          ctx.fillRect(-8, -8, 16, 16);
          ctx.strokeStyle = "#fff4b7";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, 0, part.r + 8, -Math.PI / 2, -Math.PI / 2 + hpRatio * Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeStyle = "#ff8aa7";
          ctx.lineWidth = 4;
          ctx.globalAlpha = 0.42;
          ctx.beginPath();
          ctx.moveTo(-16, -16); ctx.lineTo(16, 16);
          ctx.moveTo(16, -16); ctx.lineTo(-16, 16);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();

      if (b.active) {
        ctx.fillStyle = "rgba(0,0,0,.50)";
        ctx.fillRect(250, 166, 780, 30);
        ctx.fillStyle = b.color;
        ctx.fillRect(258, 174, 764 * clamp(b.hp / b.maxHp, 0, 1), 14);
        drawText(b.name, W / 2, 144, 28, "center", b.core);
        drawText(`WEAPON MOUNTS ${bossParts.intact(b.parts)} / 2  -  HIT GLOWING TURRETS`,
          W / 2, 214, 18, "center", "#8ef7ff");
      }
    }

    function updateMissiles(dt) {
      for (const m of game.missiles) {
        const fromX = m.x, fromY = m.y;
        const target = findMissileTarget(m);
        const speed = Math.hypot(m.vx, m.vy) || 520;

        if (target) {
          const desired = Math.atan2(target.y - m.y, target.x - m.x);
          const current = Math.atan2(m.vy, m.vx);
          const delta = clamp(normalizeAngle(desired - current), -m.turn * dt, m.turn * dt);
          const next = current + delta;
          const nextSpeed = clamp(speed + 280 * dt, 520, 760);
          m.vx = Math.cos(next) * nextSpeed;
          m.vy = Math.sin(next) * nextSpeed;
        } else {
          m.vx = clamp(m.vx + 140 * dt, 520, 720);
        }

        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= dt;
        m.trail -= dt;

        if (m.trail <= 0) {
          m.trail = 0.035;
          const a = Math.atan2(m.vy, m.vx);
          addParticle(m.x - Math.cos(a) * 18, m.y - Math.sin(a) * 18, rand(-45, 20), rand(-45, 45), rand(0.16, 0.34), Math.random() < 0.5 ? "#ffd76b" : "#ff8f5f");
        }

        for (const e of game.enemies) {
          if (e.hp <= 0) continue;
          if (collision.sweptCircleHit(fromX, fromY, m.x, m.y, e.x, e.y, m.r + e.r)) {
            m.life = 0;
            damageEnemy(e, m.power, m.x, m.y, "#ffd76b");
            break;
          }
        }

        const b = game.boss;
        if (m.life > 0 && b && b.active) {
          const targetPart = bossParts.findHit(b, fromX, fromY, m.x, m.y, m.r);
          if (targetPart) {
            m.life = 0;
            damageBoss(m.power, m.x, m.y, "#ffd76b", targetPart);
          } else if (collision.sweptAabbHit(
            fromX, fromY, m.x, m.y,
            b.x - b.rx - m.r, b.x + b.rx + m.r, b.y - b.ry - m.r, b.y + b.ry + m.r
          )) {
            m.life = 0;
            damageBoss(m.power, m.x, m.y, "#ffd76b");
          }
        }
      }

      game.missiles = game.missiles.filter(m => m.life > 0 && m.x > -90 && m.x < W + 150 && m.y > -140 && m.y < H + 140);
    }

    function updatePlayerBullets(dt) {
      for (const b of game.bullets) {
        b.previousX = b.x;
        b.previousY = b.y;
        b.x += b.vx * dt;
        b.y += (b.vy || 0) * dt;
      }

      for (const b of game.bullets) {
        if (b.dead) continue;

        for (const e of game.enemies) {
          if (e.hp <= 0 || b.hitEnemies?.includes(e)) continue;
          if (!collision.sweptCircleHit(
            b.previousX, b.previousY, b.x, b.y, e.x, e.y, b.r + e.r
          )) continue;

          const close = e.x >= game.player.x && e.x - game.player.x <= 300;
          const damage = (b.power || 1) * (b.pointBlank && close ? 1.5 : 1);
          if (b.hitEnemies) {
            b.hitEnemies.push(e);
            b.pierce -= 1;
            b.dead = b.pierce <= 0;
          } else {
            b.dead = true;
          }
          damageEnemy(e, damage, b.x, b.y, b.c);
          if (b.dead) break;
        }

        const boss = game.boss;
        if (!b.dead && boss && boss.active) {
          const close = boss.x >= game.player.x && boss.x - game.player.x <= 300;
          const damage = (b.power || 1) * (b.pointBlank && close ? 1.5 : 1);
          const part = bossParts.findHit(
            boss, b.previousX, b.previousY, b.x, b.y, b.r
          );
          if (part) {
            b.dead = true;
            damageBoss(damage, b.x, b.y, b.c, part);
          } else if (collision.sweptAabbHit(
            b.previousX, b.previousY, b.x, b.y,
            boss.x - boss.rx - b.r, boss.x + boss.rx + b.r,
            boss.y - boss.ry - b.r, boss.y + boss.ry + b.r
          )) {
            b.dead = true; // Piercing lances also only hit a Boss once.
            damageBoss(damage, b.x, b.y, b.c);
          }
        }
      }

      game.bullets = game.bullets.filter(b => !b.dead && b.x < W + 80 && b.y > -90 && b.y < H + 90);
    }

    function updateEnemyBullets(dt) {
      for (const bullet of game.enemyBullets) {
        bullet.previousX = bullet.x;
        bullet.previousY = bullet.y;
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        bullet.life -= dt;
      }

      // Resolve ALL potentially lethal contacts before awarding ANY graze energy.
      // This prevents bullet iteration order from granting a bonus on a hit frame.
      if (game.invuln <= 0) {
        const player = game.player;
        const hitbox = selectedShip().hitbox;
        let contact = null;
        for (const bullet of game.enemyBullets) {
          if (bullet.life <= 0) continue;
          if (collision.sweptCircleHit(
            bullet.previousX, bullet.previousY, bullet.x, bullet.y,
            player.x, player.y, bullet.r + hitbox
          )) {
            contact = bullet;
            break;
          }
        }

        if (contact) {
          contact.life = 0;
          damagePlayer();
        } else {
          for (const bullet of game.enemyBullets) {
            if (bullet.life <= 0 || bullet.grazed) continue;
            const nearDistance = Math.sqrt(collision.segmentPointDistanceSq(
              bullet.previousX, bullet.previousY, bullet.x, bullet.y, player.x, player.y
            ));
            const graze = combatRules.registerGraze(
              game.combat, bullet, player.x, player.y, hitbox, selectedShip().id, nearDistance
            );
            if (!graze.grazed) continue;
            sfx("graze");
            if (game.combat.grazes % 4 === 0) haptic("graze", 0.12, 0.07, 25, 0.14);
            for (let i = 0; i < 5; i++) addParticle(
              bullet.x, bullet.y, rand(-85, 85), rand(-85, 85), rand(0.12, 0.32), "#8ef7ff"
            );
            announceDriveReady(graze.ready);
          }
        }
      }

      game.enemyBullets = game.enemyBullets.filter(b => b.life > 0 && b.x > -60 && b.x < W + 80 && b.y > -80 && b.y < H + 80);
    }

    function damagePlayer() {
      if (game.invuln > 0 || game.state !== "PLAYING") return;
      const hit = combatRules.takeHit(game.combat, selectedShip().id);
      if (hit.blocked) {
        game.invuln = 0.85;
        game.shake = Math.max(game.shake, 9);
        sfx("overdriveReady");
        haptic("shield", 0.34, 0.24, 100, 0.12);
        showMessage("VANGUARD SHIELD ABSORBED HIT", 1.2);
        for (let i = 0; i < 24; i++) addParticle(
          game.player.x, game.player.y, rand(-170, 170), rand(-170, 170), rand(0.18, 0.48), "#fff4b7"
        );
        return;
      }

      sfx("damage");
      hapticDamage();
      game.stats.damageTaken += 1;
      dropPlayerPowerOnHit();
      game.hp -= 1;
      game.invuln = 1.25;
      game.shake = 18;

      for (let i = 0; i < 42; i++) addParticle(game.player.x, game.player.y, rand(-300, 230), rand(-245, 245), rand(0.3, 0.9), i % 2 ? "#d8fbff" : "#ff6b5a");

      if (game.hp <= 0) {
        if (game.mode === "training") {
          // Infinite lives for drills, but keep real hit feedback and stats.
          game.stats.trainingResets += 1;
          game.hp = game.hpMax;
          game.invuln = 2.5;
          game.bomb = game.bombMax;
          game.weaponLevel = 3;
          game.combat = combatRules.createState();
          game.player.x = 175;
          game.player.y = H / 2;
          showMessage("TRAINING RESET - CONTINUE PRACTICING", 1.6);
        } else {
          gameOver();
        }
      }
    }

    function readInput(dt) {
      const pad = gamepadAwaitRelease ? null : readActivePad();
      const axisX = controller.normalizeAxis(pad?.axes?.[0], settings.stickDeadzone);
      const axisY = controller.normalizeAxis(pad?.axes?.[1], settings.stickDeadzone);

      let ix = 0;
      let iy = 0;

      if (keys.ArrowLeft || keys.KeyA || pad?.buttons?.[14]?.pressed) ix -= 1;
      if (keys.ArrowRight || keys.KeyD || pad?.buttons?.[15]?.pressed) ix += 1;
      if (keys.ArrowUp || keys.KeyW || pad?.buttons?.[12]?.pressed) iy -= 1;
      if (keys.ArrowDown || keys.KeyS || pad?.buttons?.[13]?.pressed) iy += 1;

      ix += axisX;
      iy += axisY;

      const mag = Math.hypot(ix, iy) || 1;
      ix /= mag;
      iy /= mag;

      const ship = selectedShip();
      const overdriveSpeed = ship.id === "falcon" && combatRules.isActive(game.combat) ? 1.18 : 1;
      game.player.vx = ix * ship.speed * overdriveSpeed;
      game.player.vy = iy * ship.speed * overdriveSpeed;
      // Player can now use most of the screen width.
      // Right edge still leaves a small safety margin so the jet never clips off-screen.
      game.player.x = clamp(game.player.x + game.player.vx * dt, 76, W - 130);
      game.player.y = clamp(game.player.y + game.player.vy * dt, 72, H - 72);

      return !!(
        keys.Space ||
        keys.KeyJ ||
        keys.KeyK ||
        controller.pressed(pad, settings.firePrimary) ||
        controller.pressed(pad, settings.fireSecondary)
      );
    }

    function useBomb() {
      if (game.state !== "PLAYING") return;
      if (game.stageMode === "TRANSITION" || game.stageMode === "BOSS_REWARD") return;
      if (game.bomb <= 0) {
        showMessage("NO BOMB", 0.8);
        return;
      }

      game.bomb -= 1;
      game.stats.bombsUsed += 1;
      game.bombFlash = 0.55;
      game.invuln = Math.max(game.invuln, 2.0);
      game.shake = Math.max(game.shake, 26);

      sfx("bomb");
      hapticBomb();
      showMessage("BOMB  CLEAR BULLETS", 1.15);

      game.enemyBullets.length = 0;

      for (const e of game.enemies) {
        if (e.hp <= 0) continue;

        const damage = Math.max(8, e.maxHp * 0.72);
        e.hp -= damage;

        for (let i = 0; i < 18; i++) {
          addParticle(
            e.x + rand(-e.r, e.r),
            e.y + rand(-e.r, e.r),
            rand(-260, 210),
            rand(-230, 230),
            rand(0.25, 0.72),
            i % 2 ? "#ffffff" : "#8ef7ff"
          );
        }

        if (e.hp <= 0) {
          awardEnemyKill(e, "bomb");
        }
      }

      game.enemies = game.enemies.filter(e => e.hp > 0);
      // A bomb can complete the wave without another regular shot.
      if (game.stageMode === "WAVE" && game.waveKills >= killTarget()) {
        spawnBoss();
      }

      const b = game.boss;
      if (b && b.active) {
        const bossDamage = Math.max(80, b.maxHp * (game.loop >= 2 ? 0.08 : 0.11));
        b.hp -= bossDamage;

        for (let i = 0; i < 54; i++) {
          addParticle(
            b.x + rand(-b.rx, b.rx),
            b.y + rand(-b.ry, b.ry),
            rand(-300, 230),
            rand(-270, 270),
            rand(0.30, 0.88),
            i % 2 ? b.core : "#ffffff"
          );
        }

        if (b.hp <= 0) {
          b.hp = 0;
          awardBossKill("bomb");
          killBoss();
        }
      }

      for (let i = 0; i < 90; i++) {
        const angle = rand(0, Math.PI * 2);
        const radius = rand(40, 460);

        addParticle(
          game.player.x + Math.cos(angle) * rand(10, 90),
          game.player.y + Math.sin(angle) * rand(10, 90),
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          rand(0.25, 0.85),
          i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#8ef7ff" : "#fff4b7"
        );
      }
    }

    function finishBossReward() {
      if (!game.pendingStageAdvance) return;

      if (game.mode === "bossRush" && game.pendingStageAdvance.kind === "complete") {
        game.highScore = saveModeHighScore(game.mode, game.score);
        archiveRankedRun(true);
        game.pendingStageAdvance = null;
        game.state = "RUSH_CLEAR";
        game.stageMode = "COMPLETE";
        stopBgm();
        showMessage("ALL FIVE BOSSES DEFEATED", 2);
        return;
      }

      if (game.mode === "training") {
        // Each practice round repeats the selected stage; restore practice equipment.
        game.trainingRounds += 1;
        game.hp = game.hpMax;
        game.bomb = game.bombMax;
        game.weaponLevel = 3;
        game.weaponType = "blue";
        game.invuln = 2.5;
        game.combat = combatRules.createState();
      }

      // First five-stage clear earns a proper ending screen, but never breaks the arcade loop.
      if (!game.firstClearAcknowledged && game.loop === 1 && game.stageIndex === stages.length - 1 &&
          game.pendingStageAdvance.loop === 2) {
        game.firstClearAcknowledged = true;
        game.highScore = saveHighScore(game.score);
        game.newBadges = recordStore.unlock(rankedRunSummary(true), {firstClear:true});
        game.state = "ENDING";
        stopBgm();
        showMessage("ALL FIVE STAGES CLEAR", 2);
        return;
      }

      game.loop = game.pendingStageAdvance.loop;
      game.stageIndex = game.pendingStageAdvance.stageIndex;
      game.world = worlds.createState(game.stageIndex);
      game.transitionText = game.pendingStageAdvance.text;
      game.pendingStageAdvance = null;

      game.stageMode = "TRANSITION";
      game.stats.reachedLoop = Math.max(game.stats.reachedLoop, game.loop);
      game.stats.reachedStage = Math.max(game.stats.reachedStage, game.stageIndex + 1);
      game.transition = 2.7;
      game.waveKills = 0;
      game.nextGuaranteedP = 6;
      game.spawnTimer = 1.0;
      game.formationTimer = 5.0;
      game.stageIntro = 2.4;
      game.powerups.length = 0;

      showMessage(game.transitionText, 2.0);
    }

    function updatePlaying(dt) {
      if (game.state !== "PLAYING") return;

      game.t += dt;
      game.fireCooldown -= dt;
      game.invuln = Math.max(0, game.invuln - dt);
      game.bombFlash = Math.max(0, game.bombFlash - dt);

      if (game.messageTimer > 0) game.messageTimer = Math.max(0, game.messageTimer - dt);

      if (game.stageMode === "TRANSITION") {
        game.transition -= dt;
        if (game.transition <= 0) {
          game.stageMode = "WAVE";
          game.stageIntro = 2.4;
          if (game.mode === "bossRush") {
            spawnBoss();
            showMessage(`BOSS ${game.stageIndex + 1} / ${stages.length}  -  INCOMING`, 2.0);
          } else {
            startBgm();
            showMessage(game.mode === "training"
              ? `TRAINING ${stageDef().short}  /  ROUND ${game.trainingRounds + 1}`
              : `${stageDef().name}  /  LOOP ${game.loop}`, 2.0);
          }
        }
        updateParticles(dt);
        return;
      }

      if (game.stageMode === "BOSS_REWARD") {
        game.t += dt;
        game.rewardTimer -= dt;
        readInput(dt);
        updatePowerups(dt);
        updateParticles(dt);

        if (game.rewardTimer <= 0) {
          finishBossReward();
        }

        return;
      }

      const hazardChange = worlds.step(
        game.world, dt, game.stageIndex, game.player, game.stageMode, game.loop
      );
      if (hazardChange.warning) {
        sfx("hazardWarn");
        showMessage(worlds.PROFILES[game.stageIndex].name + " - EVADE", 1.15);
      }
      if (hazardChange.activated) game.shake = Math.max(game.shake, 5);

      if (combatRules.tick(game.combat, dt)) {
        sfx("overdriveOff");
        showMessage("OVERDRIVE OFFLINE", 0.8);
      }

      const firing = readInput(dt);
      if (firing && game.fireCooldown <= 0) {
        game.fireCooldown = getFireCooldown();
        firePlayerWeapons();
      }

      if (game.stageMode === "WAVE") {
        game.spawnTimer -= dt;
        game.formationTimer -= dt;

        if (game.formationTimer <= 0) {
          spawnFormation();
          game.formationTimer = rand(8.5, 12.5) - Math.min(2.0, (game.loop - 1) * 0.45);
        }

        if (game.spawnTimer <= 0) {
          spawnEnemy();
          const base = Math.max(0.38, 0.86 - (game.loop - 1) * 0.06 - game.stageIndex * 0.032);
          game.spawnTimer = rand(base * 0.55, base * 1.10);
        }
      }

      updateEnemies(dt);
      updateBoss(dt);
      updatePlayerBullets(dt);
      updateMissiles(dt);
      updateEnemyBullets(dt);
      updatePowerups(dt);
      updateParticles(dt);

      if (game.invuln <= 0) {
        for (const e of game.enemies) {
          if (dist(game.player.x, game.player.y, e.x, e.y) < e.r + selectedShip().hitbox) {
            e.hp = 0;
            damagePlayer();
            break;
          }
        }

        const b = game.boss;
        if (game.invuln <= 0 && b && b.active && Math.abs(game.player.x - b.x) < b.rx + selectedShip().hitbox && Math.abs(game.player.y - b.y) < b.ry + selectedShip().hitbox) {
          damagePlayer();
        }
      }

      if (game.invuln <= 0 && worlds.touchesPlayer(
        game.world, game.player.x, game.player.y, selectedShip().hitbox
      )) {
        damagePlayer();
        showMessage("ARENA HAZARD - " + worlds.PROFILES[game.stageIndex].name, 1.25);
      }

      if (game.stageIntro > 0) game.stageIntro = Math.max(0, game.stageIntro - dt);
    }

    function drawBackground(dt) {
      const st = stageDef ? stageDef() : stages[0];
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, st.bgTop);
      grd.addColorStop(0.52, st.bgMid);
      grd.addColorStop(1, st.bgBot);
      ctx.fillStyle = grd;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      for (const s of game.stars) {
        const speed = game.state === "TITLE" || game.state === "SELECT" ? 44 : 90;
        s.x -= speed * s.z * dt;
        if (s.x < -8) {
          s.x = W + rand(0, 80);
          s.y = rand(0, H);
          s.z = rand(0.35, 2.2);
        }
        ctx.fillStyle = s.z > 1.35 ? "#c9fbff" : "#47689f";
        ctx.fillRect(s.x, s.y, Math.ceil(s.z * 2), Math.ceil(s.z * 2));
      }

      ctx.fillStyle = hexToRgba(st.grid, 0.08);
      for (let x = -80; x < W + 80; x += 80) ctx.fillRect(x, 0, 2, H);
      for (let y = 0; y < H; y += 80) ctx.fillRect(0, y, W, 2);
      worlds.drawAtmosphere(ctx, game.stageIndex, game.t, W, H);
    }

    function hexToRgba(hex, alpha) {
      const n = parseInt(hex.slice(1), 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function drawPlayerBullets() {
      for (const b of game.bullets) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy || 0, b.vx || 1));
        const core = b.c || "#5ae8ff";
        const length = b.lance ? 90 : b.power > 1.5 ? 40 : b.power > 1.1 ? 34 : 30;
        const height = b.lance ? 22 : b.r > 9 ? 12 : 10;
        if (b.lance) {
          ctx.shadowColor = "#8ef7ff";
          ctx.shadowBlur = 22;
        }
        rect(-4, -height / 2, length, height, "#eefcff");
        rect(10, -2, length - 10, 4, core);
        if (b.power > 1.3) rect(-10, -2, 10, 4, "rgba(255,241,168,.65)");
        ctx.restore();
      }
    }

    function drawMissiles() {
      for (const m of game.missiles) {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(Math.atan2(m.vy, m.vx));
        rect(-18, -6, 34, 12, "#ffd76b");
        rect(-8, -4, 18, 8, "#fff4b7");
        rect(-24, -4, 8, 8, "#ff8f5f");
        rect(10, -9, 8, 6, "#ffe083");
        rect(10, 3, 8, 6, "#ffe083");
        ctx.restore();
      }
    }

    function drawEnemyBullets() {
      for (const b of game.enemyBullets) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        rect(-10, -3, 20, 6, b.c);
        rect(-2, -5, 10, 10, b.glow);
        rect(-16, -1, 10, 2, "rgba(255,255,255,.35)");
        ctx.restore();
      }
    }

    function drawOverdriveAura() {
      if (!combatRules.isActive(game.combat)) return;
      const ship = selectedShip();
      const p = game.player;
      const pulse = 0.75 + Math.sin(game.t * 17) * 0.2;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = ship.accent;
      ctx.lineWidth = 5;
      ctx.globalAlpha = pulse;
      ctx.shadowColor = ship.accent;
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.ellipse(0, 0, ship.hitbox + 66, ship.hitbox + 58, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (ship.id === "vanguard" && game.combat.guard > 0) {
        ctx.strokeStyle = "#fff4b7";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 88, 70, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawBombFlash() {
      if (!game.bombFlash || game.bombFlash <= 0) return;

      const a = clamp(game.bombFlash / 0.55, 0, 1);

      ctx.fillStyle = `rgba(255,255,255,${0.34 * a})`;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(game.player.x, game.player.y);

      ctx.strokeStyle = `rgba(142,247,255,${0.90 * a})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 620 * (1 - a) + 80, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,244,183,${0.55 * a})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 820 * (1 - a) + 120, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    function drawHpParallelograms(x, y, hp, maxHp) {
      // Match the original v22 HP glyph style:
      // ▰ = filled slanted parallelogram, ▱ = hollow slanted parallelogram.
      // We draw the shapes manually to avoid Android/AYANEO font baseline drift
      // between the filled and hollow Unicode glyphs.
      const w = 17;
      const h = 21;
      const slant = 6;
      const gap = 4;

      ctx.save();
      ctx.lineJoin = "miter";
      ctx.lineCap = "butt";

      for (let i = 0; i < maxHp; i++) {
        const x0 = x + i * (w + gap);
        const y0 = y;

        ctx.beginPath();
        ctx.moveTo(x0 + slant, y0);
        ctx.lineTo(x0 + w, y0);
        ctx.lineTo(x0 + w - slant, y0 + h);
        ctx.lineTo(x0, y0 + h);
        ctx.closePath();

        if (i < hp) {
          ctx.fillStyle = "#e7fbff";
          ctx.shadowColor = "#e7fbff";
          ctx.shadowBlur = 7;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = "#e7fbff";
          ctx.lineWidth = 2.2;
          ctx.shadowColor = "#e7fbff";
          ctx.shadowBlur = 4;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();
    }

    function drawHud() {
      const meta = weaponMeta();

      // Preserve the readable three-panel HUD while adding a compact lower Overdrive strip.
      ctx.fillStyle = "rgba(0,0,0,.36)";
      ctx.fillRect(24, 22, 590, 78);
      drawText(`SCORE ${String(game.score).padStart(6, "0")}`, 44, 50, 26);
      drawText(game.mode === "training" ? "FREE PLAY  /  NO RANK" :
        `HI ${String(game.highScore).padStart(6, "0")}`, 44, 80, 21, "left", "#fff4b7");
      drawText("HP", 316, 64, 25, "left", "#e7fbff");
      drawHpParallelograms(360, 53, Math.max(0, game.hp), Math.max(0, game.hpMax));

      ctx.fillStyle = "rgba(0,0,0,.34)";
      ctx.fillRect(636, 22, 312, 78);
      drawText(`BOMB ${"●".repeat(Math.max(0, game.bomb))}${"○".repeat(Math.max(0, game.bombMax - game.bomb))}`, 656, 50, 23, "left", "#8ef7ff");
      drawText(`${meta.short} WEAPON  LV.${game.weaponLevel}`, 656, 80, 21, "left", meta.color);

      ctx.fillStyle = "rgba(0,0,0,.30)";
      ctx.fillRect(978, 22, 278, 78);
      drawText(game.mode === "bossRush" ? "BOSS RUSH" :
        game.mode === "training" ? `TRAINING ${game.trainingRounds + 1}` :
        `LOOP ${game.loop}`, 1002, 50, 22, "left", "#e7fbff");
      drawText(`STAGE ${game.stageIndex + 1} / 5`, 1002, 80, 23, "left", "#e7fbff");

      if (game.stageMode === "WAVE") {
        ctx.fillStyle = "rgba(0,0,0,.36)";
        ctx.fillRect(24, 116, 330, 36);
        drawText(`KILLS ${game.waveKills}/${killTarget()}  → BOSS`, 42, 135, 20);
      }

      if (game.stageMode === "WAVE" || game.stageMode === "BOSS") {
        const combat = game.combat;
        const active = combatRules.isActive(combat);
        const baseX = 24, baseY = H - 112;
        ctx.fillStyle = "rgba(0,0,0,.58)";
        ctx.fillRect(baseX, baseY, 510, 92);
        const accent = active ? "#fff4b7" : combat.energy >= 100 ? "#8ef7ff" : "#38e8ff";
        const title = active
          ? `OVERDRIVE ACTIVE  ${combat.active.toFixed(1)}s`
          : combat.energy >= 100
          ? `OVERDRIVE READY  ${controller.buttonLabel(settings.overdriveButton)} / C`
          : `OVERDRIVE  ${Math.floor(combat.energy)} / 100`;
        drawText(title, baseX + 20, baseY + 25, 23, "left", accent);
        ctx.fillStyle = "rgba(255,255,255,.13)";
        ctx.fillRect(baseX + 20, baseY + 52, 470, 13);
        ctx.fillStyle = accent;
        ctx.fillRect(baseX + 20, baseY + 52, 470 * (active ? combat.active / (selectedShip().id === "falcon" ? 6 : 7) : combat.energy / 100), 13);
        drawText(active ? selectedShip().id === "vanguard" ? `SHIELD ${combat.guard}` : "FALCON BOOST"
          : "GRAZE BULLETS / DESTROY ENEMIES TO CHARGE", baseX + 20, baseY + 78, 17, "left", "#c3e9f2");

        ctx.fillStyle = "rgba(0,0,0,.52)";
        ctx.fillRect(W - 352, H - 102, 328, 80);
        drawText(`CHAIN ${combat.combo}  x${combatRules.multiplier(combat.combo)}`, W - 336, H - 70, 27, "left", "#fff4b7");
        drawText(`GRAZES ${combat.grazes}  /  BEST ${combat.maxCombo}`, W - 336, H - 37, 19, "left", "#e7fbff");
      }

      if (game.stageIntro > 0 && game.state === "PLAYING" && game.stageMode === "WAVE") {
        ctx.fillStyle = "rgba(0,0,0,.42)";
        ctx.fillRect(W / 2 - 360, H / 2 - 60, 720, 120);
        drawText(`${stageDef().name}`, W / 2, H / 2 - 14, 34, "center", stageDef().grid);
        drawText(game.mode === "training" ?
          `PRACTICE ROUND ${game.trainingRounds + 1}  /  ${killTarget()} KILLS TO BOSS` :
          `LOOP ${game.loop}  /  ENEMY COUNT ${killTarget()}`,
          W / 2, H / 2 + 34, 24, "center", "#e7fbff");
      }

      if (game.stageMode === "BOSS_REWARD") {
        ctx.fillStyle = "rgba(0,0,0,.34)";
        ctx.fillRect(W / 2 - 390, H / 2 - 54, 780, 108);
        drawText("BOSS CLEAR", W / 2, H / 2 - 18, 34, "center", "#fff4b7");
        drawText("GET THE BOMB ITEM", W / 2, H / 2 + 28, 24, "center", "#8ef7ff");
      }

      if (game.stageMode === "TRANSITION") {
        ctx.fillStyle = "rgba(0,0,0,.60)";
        ctx.fillRect(0, 0, W, H);
        drawText(game.transitionText, W / 2, H / 2 - 8, 42, "center", "#fff4b7");
        drawText("PREPARE FOR NEXT AREA", W / 2, H / 2 + 46, 24, "center", "#e7fbff");
      }

      if (game.messageTimer > 0) {
        const msgY = game.boss ? 222 : 154;
        ctx.fillStyle = "rgba(0,0,0,.45)";
        ctx.fillRect(W / 2 - 320, msgY, 640, 58);
        drawText(game.message, W / 2, msgY + 30, 26, "center");
      }
    }

    function drawPerformanceOverlay() {
      if (!performanceOverlay) return;
      const x = 552, y = H - 117;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.74)";
      ctx.fillRect(x, y, 378, 98);
      ctx.strokeStyle = "rgba(142,247,255,.6)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, 378, 98);
      drawText(`FPS ${game.fps}   >25ms ${game.slowFrames}`, x + 14, y + 25, 19, "left", "#8ef7ff");
      drawText(`FX ${game.particles.length}/${LIMITS.particles}  EB ${game.enemyBullets.length}/${LIMITS.enemyBullets}`, x + 14, y + 53, 18, "left");
      drawText(`EN ${game.enemies.length}/${LIMITS.enemies} SHOTS ${game.bullets.length} MISSILES ${game.missiles.length}`, x + 14, y + 81, 17, "left");
      ctx.restore();
    }

    function drawOverlay() {
      if (game.state !== "PAUSED") return;

      ctx.fillStyle = "rgba(5,6,20,.78)";
      ctx.fillRect(0, 0, W, H);
      const controlsPage = pauseMenu.page === "controls";
      const items = currentPauseItems();

      drawText(controlsPage ? "CONTROLLER OPTIONS" : "PAUSED", W / 2, 176, controlsPage ? 56 : 68, "center", "#e7fbff");
      drawText("D-PAD: SELECT / ADJUST     B / ENTER: CONFIRM     START: RESUME", W / 2, 232, 21, "center", "rgba(231,251,255,.78)");

      const boxX = W / 2 - 360;
      const boxY = 290;
      const rowH = 50;

      ctx.fillStyle = "rgba(0,0,0,.46)";
      ctx.fillRect(boxX, boxY - 22, 720, rowH * items.length + 44);

      for (let i = 0; i < items.length; i++) {
        const y = boxY + i * rowH;
        const selected = i === pauseMenu.index;

        if (selected) {
          ctx.fillStyle = "rgba(142,247,255,.18)";
          ctx.fillRect(boxX + 18, y - 22, 684, 44);
          ctx.strokeStyle = "rgba(142,247,255,.72)";
          ctx.lineWidth = 2;
          ctx.strokeRect(boxX + 18, y - 22, 684, 44);
        }

        const labelColor = selected ? "#8ef7ff" : "rgba(231,251,255,.78)";
        drawText((selected ? "> " : "  ") + items[i], boxX + 52, y, 25, "left", labelColor);
        const value = pauseItemValue(i);
        if (value) {
          drawText(value, boxX + 650, y, 24, "right", selected ? "#fff4b7" : "rgba(231,251,255,.70)");
        }
      }

      if (controllerNotice) {
        drawText(controllerNotice, W / 2, 822, 21, "center", "#fff4b7");
      } else if (controlsPage) {
        drawText("B / RT FIRE, A BOMB BY DEFAULT. MENU B AND START ALWAYS WORK.", W / 2, 822, 19, "center", "rgba(231,251,255,.70)");
      } else {
        drawText("CONTROLLER OPTIONS: REMAP FIRE / BOMB AND CALIBRATE STICK", W / 2, 822, 19, "center", "rgba(231,251,255,.70)");
      }
    }

    function drawTitleScreen(dt) {
      drawBackground(dt);

      const rg = ctx.createRadialGradient(W * 0.52, H * 0.38, 60, W * 0.52, H * 0.38, 680);
      rg.addColorStop(0, "rgba(80, 230, 255, 0.18)");
      rg.addColorStop(0.45, "rgba(120, 70, 255, 0.10)");
      rg.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);

      drawText("NEON WINGS", W / 2, 195, 86, "center", "#e7fbff");
      drawText("HANDHELD ARCADE  /  v26.1.1", W / 2, 270, 28, "center", "#98f5ff");
      drawText(`HIGH SCORE ${String(highScore()).padStart(6, "0")}`, W / 2, 318, 24, "center", "#fff4b7");

      drawPlayerShip(W / 2 - 170, 492, -0.20, false, ships[0]);
      drawPlayerShip(W / 2 + 180, 492, 0.12, false, ships[1]);

      ctx.fillStyle = "rgba(0,0,0,.34)";
      ctx.fillRect(W / 2 - 360, 625, 720, 72);
      drawText("PRESS START / ENTER", W / 2, 662, 28, "center", "#fff4b7");
      drawText("CLASSIC ARCADE  /  BOSS RUSH  /  TRAINING", W / 2, 760, 23, "center", "rgba(231,251,255,.86)");
      drawText("CHOOSE A MODE AND FIGHTER AFTER PRESSING START", W / 2, 809, 19, "center", "#8ef7ff");
      drawText("H / GAMEPAD X: LOCAL RECORDS AND ACHIEVEMENTS", W / 2, 862, 20, "center", "#fff4b7");
    }

    function drawShipPreview(ship, x, y, scale = 1.4, selected = false) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      if (selected) {
        ctx.fillStyle = "rgba(255,255,255,.10)";
        ctx.fillRect(-120, -92, 240, 184);
        ctx.strokeStyle = ship.accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(-120, -92, 240, 184);
      }
      drawPlayerShip(0, 0, 0, false, ship);
      ctx.restore();

      drawText(ship.name, x, y + 120 * scale, selected ? 26 : 22, "center", selected ? ship.accent : "rgba(231,251,255,.72)");
      drawText(ship.subtitle, x, y + 150 * scale, selected ? 20 : 17, "center", selected ? ship.core : "rgba(231,251,255,.55)");
    }

    function drawSelectScreen(dt) {
      drawBackground(dt);
      const layout = selectLayout.create(W, H);

      drawText("SELECT FIGHTER & MODE", W / 2, layout.titleY, 59, "center", "#e7fbff");
      drawText("LEFT / RIGHT: SHIP    UP / DOWN: MODE    START / ENTER: LAUNCH",
        W / 2, layout.controlsY, 22, "center", "rgba(231,251,255,.78)");

      // Mode selector is its own region, clear of the selected ship's scaled frame.
      const modeDef = modes.modeById(menu.selectedMode);
      ctx.fillStyle = "rgba(3, 12, 33, .72)";
      ctx.fillRect(layout.mode.x, layout.mode.y, layout.mode.width, layout.mode.height);
      ctx.strokeStyle = "#38e8ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(layout.mode.x, layout.mode.y, layout.mode.width, layout.mode.height);
      drawText(`<  ${modeDef.name}  >`, W / 2, layout.mode.titleY, 31, "center", "#fff4b7");
      drawText(modeDef.description, W / 2, layout.mode.descriptionY, 20, "center", "#8ef7ff");
      if (menu.selectedMode === "training") {
        drawText(`Q / E OR LB / RB: PRACTICE ${menu.trainingStage + 1} - ${stages[menu.trainingStage].short}`,
          W / 2, layout.trainingHintY, 18, "center", "#fff4b7");
      }

      // The selected fighter uses the same reference center as the idle fighter.
      // The layout's preview scale deliberately leaves >40 logical px after the mode box.
      const leftSelected = menu.selectedShip === 0;
      drawShipPreview(ships[0], layout.preview.leftX, layout.preview.y,
        leftSelected ? layout.preview.selectedScale : layout.preview.normalScale, leftSelected);
      drawShipPreview(ships[1], layout.preview.rightX, layout.preview.y,
        leftSelected ? layout.preview.normalScale : layout.preview.selectedScale, !leftSelected);

      const ship = selectedShip();
      ctx.fillStyle = "rgba(0,0,0,.44)";
      ctx.fillRect(layout.detail.x, layout.detail.y, layout.detail.width, layout.detail.height);
      drawText(`${ship.name} / ${ship.subtitle}`, W / 2, layout.detail.titleY, 28, "center", ship.accent);
      drawText(ship.desc, W / 2, layout.detail.descriptionY, 23, "center", "#e7fbff");

      const stat = ship.id === "falcon"
        ? "SPEED HIGH    HITBOX SMALL    HP 3/5"
        : "SPEED MEDIUM    ARMOR HIGH    HP 4/6";
      drawText(stat, W / 2, layout.detail.statsY, 20, "center", "rgba(231,251,255,.75)");
      if (menu.selectedMode !== "training") {
        drawText(`MODE BEST ${String(modeHighScore(menu.selectedMode)).padStart(6,"0")}`,
          W / 2, layout.detail.bestY, 21, "center", "#fff4b7");
      } else {
        drawText("PRACTICE ONLY  /  NO SCORE RANKING",
          W / 2, layout.detail.bestY, 21, "center", "#fff4b7");
      }
    }

    function drawFirstClearEnding() {
      // Static background is intentional: no gameplay simulation while acknowledging a clear.
      drawBackground(0);
      ctx.fillStyle = "rgba(2, 6, 23, 0.86)";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W / 2, 315);
      ctx.strokeStyle = "#8ef7ff";
      ctx.shadowColor = "#38e8ff";
      ctx.shadowBlur = 34;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 345, 164, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      drawText("NEON WINGS", W / 2, 265, 76, "center", "#e7fbff");
      drawText("FIRST DAWN", W / 2, 333, 42, "center", "#fff4b7");
      drawText("ALL FIVE STAGES CLEARED", W / 2, 401, 29, "center", "#8ef7ff");

      ctx.fillStyle = "rgba(8, 19, 46, 0.80)";
      ctx.fillRect(238, 455, 804, 210);
      ctx.strokeStyle = "rgba(142, 247, 255, 0.46)";
      ctx.lineWidth = 2;
      ctx.strokeRect(238, 455, 804, 210);
      drawText("THE SKIES ARE YOURS - FOR NOW", W / 2, 500, 26, "center", "#e7fbff");
      drawText(`SCORE ${String(game.score).padStart(6, "0")}`, 310, 565, 29, "left", "#fff4b7");
      drawText(`KILLS ${game.stats.kills}`, 770, 565, 25, "left", "#8ef7ff");
      drawText(`MAX CHAIN ${game.combat.maxCombo}`, 310, 617, 23, "left", "#e7fbff");
      drawText(`GRAZES ${game.combat.grazes}`, 770, 617, 23, "left", "#e7fbff");

      drawText("LOOP 2 AWAITS - ENEMIES BECOME STRONGER", W / 2, 741, 26, "center", "#e7fbff");
      drawText("PRESS START / ENTER TO CONTINUE", W / 2, 805, 27, "center", "#8ef7ff");
      drawText(`ACHIEVEMENTS UNLOCKED ${game.newBadges.length}`, W / 2, 854, 18, "center", "#fff4b7");
      drawText("YOUR HIGH SCORE IS SAVED LOCALLY", W / 2, 899, 17, "center", "#b4c7dc");
    }

    function drawBossRushClearScreen() {
      drawBackground(0);
      ctx.fillStyle = "rgba(2, 7, 20, .86)";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W / 2, 290);
      ctx.strokeStyle = "#fff4b7";
      ctx.shadowColor = "#d79aff";
      ctx.shadowBlur = 34;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 380, 158, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      drawText("BOSS RUSH", W / 2, 250, 75, "center", "#fff4b7");
      drawText("COMPLETE", W / 2, 335, 56, "center", "#8ef7ff");
      drawText("FIVE WEAPONIZED TITANS DEFEATED", W / 2, 423, 27, "center", "#e7fbff");

      ctx.fillStyle = "rgba(8, 19, 46, .76)";
      ctx.fillRect(224, 482, 832, 203);
      ctx.strokeStyle = "rgba(142,247,255,.58)";
      ctx.lineWidth = 2;
      ctx.strokeRect(224, 482, 832, 203);
      drawText(`SCORE  ${String(game.score).padStart(6,"0")}`, W / 2, 527, 32, "center", "#fff4b7");
      drawText(`BEST  ${String(game.highScore).padStart(6,"0")}`, W / 2, 583, 30, "center", "#8ef7ff");
      drawText(`MAX CHAIN ${game.combat.maxCombo}   GRAZES ${game.combat.grazes}   BOMBS ${game.stats.bombsUsed}`,
        W / 2, 648, 21, "center", "#e7fbff");

      drawText(`GRADE ${game.resultGrade || "C"}   /   NEW ACHIEVEMENTS ${game.newBadges.length}`,
        W / 2, 709, 25, "center", "#fff4b7");
      drawText("RUN RECORDED  /  NO WAVES REQUIRED", W / 2, 751, 26, "center", "#e7fbff");
      drawText("PRESS START / ENTER TO RETURN TO TITLE", W / 2, 823, 24, "center", "#8ef7ff");
    }

    function drawLocalRecordsScreen() {
      drawBackground(0);
      ctx.fillStyle = "rgba(3, 7, 22, .88)";
      ctx.fillRect(0, 0, W, H);

      drawText("LOCAL HANGAR RECORDS", W / 2, 116, 55, "center", "#e7fbff");
      drawText("DEVICE ONLY  /  NO ACCOUNTS  /  TOP FIVE RANKED RUNS", W / 2, 167, 20, "center", "#8ef7ff");

      const columns = [
        { mode: "classic", heading: "CLASSIC ARCADE", x: 74 },
        { mode: "bossRush", heading: "BOSS RUSH", x: 660 }
      ];
      for (const column of columns) {
        ctx.fillStyle = "rgba(6, 24, 47, .78)";
        ctx.fillRect(column.x, 211, 547, 343);
        ctx.strokeStyle = "rgba(142,247,255,.58)";
        ctx.lineWidth = 2;
        ctx.strokeRect(column.x, 211, 547, 343);
        drawText(column.heading, column.x + 24, 246, 27, "left", "#fff4b7");

        const entries = recordStore.top(column.mode);
        if (!entries.length) {
          drawText("NO RANKED RUNS YET", column.x + 28, 341, 22, "left", "#9ab0d0");
        } else {
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const ship = entry.ship === "falcon" ? "FALCON" : "VANGUARD";
            const rowY = 297 + i * 50;
            ctx.fillStyle = i % 2 ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.075)";
            ctx.fillRect(column.x + 15, rowY - 21, 517, 43);
            drawText(`${i + 1}. ${String(entry.score).padStart(6,"0")}`,
              column.x + 28, rowY, 24, "left", "#e7fbff");
            drawText(`${entry.grade} / ${ship}`, column.x + 515, rowY, 19, "right", "#8ef7ff");
          }
        }
      }

      const badges = recordStore.achievements();
      const unlocked = badges.filter(b=>b.unlocked).length;
      ctx.fillStyle = "rgba(6, 24, 47, .78)";
      ctx.fillRect(74, 583, 1133, 251);
      ctx.strokeStyle = "rgba(142,247,255,.48)";
      ctx.strokeRect(74, 583, 1133, 251);
      drawText(`ACHIEVEMENTS ${unlocked} / ${badges.length}`, 100, 616, 28, "left", "#fff4b7");
      for (let i = 0; i < badges.length; i++) {
        const b = badges[i];
        const col = Math.floor(i / 4), row = i % 4;
        drawText((b.unlocked ? "★  " : "○  ") + b.title,
          107 + col * 552, 665 + row * 45, 22, "left", b.unlocked ? "#8ef7ff" : "#6b8099");
      }

      drawText("PRESS START / ENTER / H TO RETURN", W / 2, 900, 22, "center", "#e7fbff");
    }

    function drawGameOverScreen(dt) {
      drawBackground(dt);
      updateParticles(dt);
      drawParticles();

      ctx.fillStyle = "rgba(5,6,20,.78)";
      ctx.fillRect(0, 0, W, H);

      const cardX = W / 2 - 430;
      const cardY = H / 2 - 215;
      const cardW = 860;
      const cardH = 430;

      ctx.fillStyle = "rgba(0,0,0,.54)";
      ctx.fillRect(cardX, cardY, cardW, cardH);

      ctx.strokeStyle = "rgba(255,138,167,.45)";
      ctx.lineWidth = 3;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      drawText(game.mode === "bossRush" ? "BOSS RUSH OVER" : "GAME OVER",
        W / 2, cardY + 56, game.mode === "bossRush" ? 54 : 64, "center", "#ff8aa7");

      ctx.fillStyle = "rgba(255,255,255,.06)";
      ctx.fillRect(cardX + 48, cardY + 104, cardW - 96, 76);
      drawText("SCORE", cardX + 78, cardY + 132, 23, "left", "rgba(231,251,255,.72)");
      drawText(String(game.score).padStart(6, "0"), cardX + cardW - 78, cardY + 132, 34, "right", "#e7fbff");
      drawText("HIGH SCORE", cardX + 78, cardY + 166, 23, "left", "rgba(231,251,255,.72)");
      drawText(String(game.highScore).padStart(6, "0"), cardX + cardW - 78, cardY + 166, 30, "right", "#fff4b7");

      const leftX = cardX + 78;
      const rightX = cardX + 462;
      const labelColor = "rgba(231,251,255,.68)";
      const valueColor = "#e7fbff";
      const rowY = cardY + 230;
      const rowGap = 38;

      ctx.fillStyle = "rgba(255,255,255,.045)";
      ctx.fillRect(cardX + 48, cardY + 202, cardW - 96, 146);

      drawText(game.mode === "bossRush" ? "BOSSES" : "REACHED", leftX, rowY, 21, "left", labelColor);
      drawText(game.mode === "bossRush" ?
        `${game.stats.bossesDefeated} / ${stages.length}` :
        `LOOP ${game.stats.reachedLoop} / STAGE ${game.stats.reachedStage}`,
        leftX + 170, rowY, 22, "left", valueColor);

      drawText("KILLS", leftX, rowY + rowGap, 21, "left", labelColor);
      drawText(String(game.stats.kills), leftX + 170, rowY + rowGap, 22, "left", "#8ef7ff");

      drawText("SHIP", leftX, rowY + rowGap * 2, 21, "left", labelColor);
      drawText(selectedShip().name, leftX + 170, rowY + rowGap * 2, 22, "left", valueColor);

      drawText("BOMBS USED", rightX, rowY, 21, "left", labelColor);
      drawText(String(game.stats.bombsUsed), rightX + 220, rowY, 22, "left", "#8ef7ff");

      drawText("MAX P LV", rightX, rowY + rowGap, 21, "left", labelColor);
      drawText(String(game.stats.maxWeaponLevel), rightX + 220, rowY + rowGap, 22, "left", "#fff4b7");

      drawText("DAMAGE", rightX, rowY + rowGap * 2, 21, "left", labelColor);
      drawText(String(game.stats.damageTaken), rightX + 220, rowY + rowGap * 2, 22, "left", "#ff8aa7");

      drawText(`GRADE ${game.resultGrade || "C"}   GRAZES ${game.combat.grazes}   MAX CHAIN ${game.combat.maxCombo}   OVERDRIVES ${game.combat.activations}`,
        W / 2, cardY + 361, 19, "center", "#8ef7ff");
      drawText("PRESS START / ENTER TO TITLE", W / 2, cardY + cardH - 44, 24, "center", "rgba(231,251,255,.82)");
    }

    function drawFrame(dt) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);

      const shakeX = game.shake > 0 ? rand(-game.shake, game.shake) : 0;
      const shakeY = game.shake > 0 ? rand(-game.shake, game.shake) : 0;
      game.shake = Math.max(0, game.shake - 42 * dt);

      ctx.save();
      ctx.translate(shakeX, shakeY);

      if (game.state === "TITLE") {
        drawTitleScreen(dt);
        ctx.restore();
        return;
      }

      if (game.state === "SELECT") {
        drawSelectScreen(dt);
        ctx.restore();
        return;
      }

      if (game.state === "GAME_OVER") {
        drawGameOverScreen(dt);
        ctx.restore();
        return;
      }

      if (game.state === "ENDING") {
        drawFirstClearEnding();
        ctx.restore();
        return;
      }

      if (game.state === "RUSH_CLEAR") {
        drawBossRushClearScreen();
        ctx.restore();
        return;
      }

      if (game.state === "RECORDS") {
        drawLocalRecordsScreen();
        ctx.restore();
        return;
      }

      drawBackground(dt);
      worlds.drawHazard(ctx, game.world, W, H);
      drawOverdriveAura();
      drawBombFlash();

      drawPlayerBullets();
      drawMissiles();
      drawEnemyBullets();

      for (const e of game.enemies) drawEnemy(e);
      drawBossWarning(game.boss);
      drawBoss(game.boss);
      drawPowerups();
      drawParticles();

      drawPlayerShip(game.player.x, game.player.y, game.player.vx / selectedShip().speed, game.invuln > 0, selectedShip());
      drawHud();
      drawOverlay();
      drawPerformanceOverlay();

      ctx.restore();
    }

    function loop(now) {
      const frameTime = Math.max(0, now - game.last);
      if (game.state === "PLAYING" && frameTime > 25) game.slowFrames += 1;
      const dt = clamp(frameTime / 1000, 0, 0.033);
      game.last = now;
      game.frames += 1;

      if (now - game.fpsTick > 500) {
        game.fps = Math.round(game.frames * 1000 / (now - game.fpsTick));
        game.frames = 0;
        game.fpsTick = now;
      }

      pollGamepadSystemButtons();

      if (game.state === "PLAYING") updatePlaying(dt);
      else if (game.messageTimer > 0) game.messageTimer = Math.max(0, game.messageTimer - dt);

      drawFrame(dt);
      requestAnimationFrame(loop);
    }

    function clearHeldKeys() {
      for (const code of Object.keys(keys)) keys[code] = false;
    }

    function pauseForInterruption(message) {
      clearHeldKeys();
      if (game.state === "PLAYING") {
        pauseGame();
        showMessage(message, 2.5);
      }
    }

    window.addEventListener("blur", () => pauseForInterruption("FOCUS LOST - PAUSED"));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseForInterruption("APP HIDDEN - PAUSED");
    });

    window.addEventListener("keydown", (e) => {
      unlockAudio();
      if (e.code === "F3") {
        e.preventDefault();
        if (!e.repeat) performanceOverlay = !performanceOverlay;
        return;
      }

      if (game.state === "GAME_OVER" || game.state === "RUSH_CLEAR") {
        if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space") {
          e.preventDefault();
          if (!e.repeat) returnToTitle();
        }
        return;
      }

      if (game.state === "RECORDS") {
        if (["Enter","NumpadEnter","Space","Escape","KeyH"].includes(e.code) && !e.repeat) {
          e.preventDefault();
          returnToTitle();
        }
        return;
      }

      if (game.state === "ENDING") {
        if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space") {
          e.preventDefault();
          if (!e.repeat) handleStartButton();
        }
        return;
      }

      const freshPress = !keys[e.code];
      keys[e.code] = true;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();

      if (game.state === "TITLE" && e.code === "KeyH") {
        if (freshPress) openLocalRecords();
        return;
      }

      if (game.state === "TITLE" && (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space" || e.code === "KeyJ")) {
        handleStartButton();
        return;
      }

      if (game.state === "SELECT") {
        if (!freshPress) return;
        if (e.code === "ArrowLeft" || e.code === "KeyA") cycleShip(-1);
        if (e.code === "ArrowRight" || e.code === "KeyD") cycleShip(1);
        if (e.code === "ArrowUp" || e.code === "KeyW") cycleMode(-1);
        if (e.code === "ArrowDown" || e.code === "KeyS") cycleMode(1);
        if (e.code === "KeyQ") cycleTrainingStage(-1);
        if (e.code === "KeyE") cycleTrainingStage(1);
        if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space" || e.code === "KeyJ") handleStartButton();
        return;
      }

      if (game.state === "PAUSED") {
        if (e.code === "ArrowUp" || e.code === "KeyW") pauseMenuMove(-1);
        else if (e.code === "ArrowDown" || e.code === "KeyS") pauseMenuMove(1);
        else if (e.code === "ArrowLeft" || e.code === "KeyA") adjustPauseItem(-1);
        else if (e.code === "ArrowRight" || e.code === "KeyD") adjustPauseItem(1);
        else if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space" || e.code === "KeyJ") activatePauseItem();
        else if (e.code === "KeyP" || e.code === "Escape") {
          if (pauseMenu.page === "controls") {
            pauseMenu.page = "main";
            pauseMenu.index = pauseItems.length - 1;
          } else {
            resumeGame();
          }
        }
        return;
      }

      if (game.state === "PLAYING" && (e.code === "KeyC" || e.code === "KeyI")) {
        if (freshPress) activateOverdrive();
        return;
      }

      if (game.state === "PLAYING" && (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyL" || e.code === "KeyX")) {
        if (freshPress) useBomb();
        return;
      }

      if ((e.code === "KeyP" || e.code === "Escape") && game.state === "PLAYING") {
        pauseGame();
      }

      if (e.code === "KeyF") toggleFullscreen();
    }, { passive: false });

    window.addEventListener("keyup", (e) => {
      keys[e.code] = false;
    });

    window.addEventListener("contextmenu", e => e.preventDefault());

    window.addEventListener("gamepadconnected", (event) => {
      if (activeGamepadIndex === null && Number.isInteger(event.gamepad?.index)) {
        activeGamepadIndex = event.gamepad.index;
        gamepadAwaitRelease = true;
        resetGamepadEdges();
      }
      controllerNotice = "CONTROLLER CONNECTED - PRESS START TO RESUME";
      showMessage("GAMEPAD CONNECTED", 1.5);
    });

    window.addEventListener("gamepaddisconnected", (event) => {
      if (event.gamepad?.index === activeGamepadIndex) handleControllerLoss();
    });

    requestAnimationFrame(loop);
