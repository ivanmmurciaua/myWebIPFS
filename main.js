// progressive enhancement only. site works without this file.
// - theme switch (solar default, lunar alt)
// - ?theme=lunar / ?theme=solar overrides for the current load
// - no storage: a fresh load with no query param always returns to solar
// - matrix rain background (lunar only, prefers-reduced-motion aware)
// - interactive terminal (lunar only). without js, lunar falls back to plain CV.
//
// network behavior:
//   on page load: zero external calls (fonts vendored, scripts vendored).
//   on `rabbithole` unlock: ONE eth_call to a public RPC for stealth meta-address.
//                           no fallback. if RPC fails, that line fails loudly.

import * as secp from "./vendor/noble-secp256k1.js";

// js-sha3 is loaded via classic <script> tag and sets globals.
const keccak256 = globalThis.keccak256;

(() => {
  "use strict";

  const THEMES = ["solar", "lunar"];
  const root = document.documentElement;
  const body = document.body;

  function pickTheme() {
    const q = new URLSearchParams(location.search).get("theme");
    return THEMES.includes(q) ? q : "solar";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    body.classList.toggle("term-mode", theme === "lunar");
    document.querySelectorAll("[data-set-theme]").forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        btn.dataset.setTheme === theme ? "true" : "false",
      );
    });
    if (theme === "lunar") terminal.activate();
    else terminal.deactivate();
    matrix.sync();
  }

  function setTheme(theme) {
    applyTheme(theme);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-set-theme]");
    if (!btn) return;
    setTheme(btn.dataset.setTheme);
  });

  // =============================================================
  // matrix rain (lunar only)
  // =============================================================
  const matrix = (() => {
    const canvas = document.getElementById("matrix-bg");
    if (!canvas) return { sync: () => {}, dramatic: async () => {} };
    const ctx = canvas.getContext("2d");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const GLYPHS =
      "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789ABCDEFabcdef:;<>=*+-/\\|";
    const FONT_SIZE = 14;
    const DEFAULT_FPS = 14;
    const MAX_FPS = 240;
    let FPS = DEFAULT_FPS;

    let cols = 0,
      drops = [],
      raf = 0,
      last = 0,
      running = false;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(innerWidth / FONT_SIZE);
      drops = Array.from({ length: cols }, () =>
        Math.floor(Math.random() * (innerHeight / FONT_SIZE)),
      );
      ctx.font = FONT_SIZE + "px JetBrains Mono, monospace";
    }

    function frame(t) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (t - last < 1000 / FPS) return;
      last = t;

      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, innerWidth, innerHeight);

      ctx.fillStyle = "#39ff14";
      for (let i = 0; i < drops.length; i++) {
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        ctx.fillText(ch, i * FONT_SIZE, drops[i] * FONT_SIZE);
        if (drops[i] * FONT_SIZE > innerHeight && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    function start() {
      if (running || reduced) return;
      running = true;
      resize();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function sync() {
      if (root.getAttribute("data-theme") === "lunar") start();
      else stop();
    }

    addEventListener("resize", () => {
      if (running) resize();
    });

    function ramp(durationMs = 5000) {
      if (reduced || !running) return Promise.resolve();
      return new Promise((resolve) => {
        const startTime = performance.now();
        function step() {
          const elapsed = performance.now() - startTime;
          const t = Math.min(elapsed / durationMs, 1);
          // linear, progressive from the first ms
          FPS = DEFAULT_FPS + (MAX_FPS - DEFAULT_FPS) * t;
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        }
        step();
      });
    }

    // flash structure: appear → peak (run callback) → fade out
    function flash(durationMs = 1700, atPeak = null) {
      if (reduced) {
        if (atPeak) atPeak();
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const appearMs = 100;
        const peakMs = 400;
        const fadeMs = durationMs - appearMs - peakMs;
        const el = document.createElement("div");
        el.style.cssText =
          "position:fixed;inset:0;background:#39ff14;z-index:9999;" +
          "pointer-events:none;opacity:0;" +
          `transition:opacity ${appearMs}ms ease-in;`;
        document.body.appendChild(el);
        // trigger appear
        requestAnimationFrame(() => {
          el.style.opacity = "1";
        });
        // at peak: run the swap behind the green
        setTimeout(() => {
          if (atPeak) atPeak();
        }, appearMs + 20);
        // start fade
        setTimeout(() => {
          el.style.transition = `opacity ${fadeMs}ms ease-out`;
          el.style.opacity = "0";
        }, appearMs + peakMs);
        // cleanup
        setTimeout(() => {
          el.remove();
          resolve();
        }, durationMs);
      });
    }

    async function dramatic(onPeak) {
      if (reduced) {
        if (onPeak) onPeak();
        return;
      }
      await ramp(3200);
      await flash(700, () => {
        FPS = DEFAULT_FPS;
        if (onPeak) onPeak();
      });
    }

    return { sync, dramatic };
  })();

  // =============================================================
  // crypto helpers
  // =============================================================

  async function sha512Hex(s) {
    const data = new TextEncoder().encode(s);
    const buf = await crypto.subtle.digest("SHA-512", data);
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function bytesToHex(bytes) {
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function hexToBytes(hex) {
    const h = hex.startsWith("0x") ? hex.slice(2) : hex;
    const out = new Uint8Array(h.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }

  function bigintFromBytes(bytes) {
    let n = 0n;
    for (const b of bytes) n = (n << 8n) | BigInt(b);
    return n;
  }

  // =============================================================
  // stealth address derivation (ERC-5564 scheme 1)
  // =============================================================

  // Literal eth_call to read Iván's stealth meta-address from the
  // EIP-6538 singleton registry. No ABI, no encoding — call is sealed.
  //
  // breakdown of `data`:
  //   selector  0x7aa8b5ad                                      = stealthMetaAddressOf(address,uint256)
  //   arg[0]    0x...dc68406ae47501f2ae5a86b6bb1f66e1415e3beb   = iván's registrant EOA
  //   arg[1]    0x...0002                                        = schemeId 2
  //
  // returns abi-encoded bytes: offset(32) + length(32) + payload.
  // payload for schemeId 2 = 67 bytes:
  //   prefix     1 byte  (0x00, scheme-specific marker)
  //   spend pub  33 bytes (compressed secp256k1)
  //   view pub   33 bytes (compressed secp256k1)
  const RPC_URL = "https://arb-one.api.pocket.network";
  const STEALTH_CALL = {
    to: "0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538",
    data:
      "0x7aa8b5ad" +
      "000000000000000000000000dc68406ae47501f2ae5a86b6bb1f66e1415e3beb" +
      "0000000000000000000000000000000000000000000000000000000000000002",
  };

  async function fetchMetaAddress() {
    const resp = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [STEALTH_CALL, "latest"],
        id: 1,
      }),
    });
    if (!resp.ok) throw new Error("RPC HTTP " + resp.status);
    const json = await resp.json();
    if (json.error) throw new Error(json.error.message || "RPC error");

    const stripped = (json.result || "0x").replace("0x", "");
    if (stripped.length < 128) throw new Error("empty response");
    const length = parseInt(stripped.slice(64, 128), 16);
    if (length === 0) throw new Error("registrant not registered");
    if (length !== 67) throw new Error("unexpected payload length: " + length);
    const payload = stripped.slice(128, 128 + 134);
    // skip 1-byte scheme prefix (2 hex chars), then 33-byte K_s, then 33-byte K_v
    return {
      spendPub: "0x" + payload.slice(2, 68),
      viewPub: "0x" + payload.slice(68, 134),
    };
  }

  async function deriveStealth() {
    const { spendPub, viewPub } = await fetchMetaAddress();

    // ERC-5564 scheme 1 (secp256k1 + keccak256):
    // 1. random ephemeral private key
    const eph = secp.utils.randomPrivateKey();
    // 2. ephemeral public key, compressed
    const ephPub = secp.getPublicKey(eph, true);
    // 3. shared secret point: e · V (compressed 33 bytes, includes prefix)
    const shared = secp.getSharedSecret(eph, viewPub.slice(2), true);
    // 4. hash shared secret with keccak256
    const hashedShared = hexToBytes(keccak256(shared));
    // 5. view tag = first byte of hashed shared
    const viewTag = hashedShared[0];
    // 6. stealth pubkey: P = K + h_s · G
    const hsScalar = bigintFromBytes(hashedShared) % secp.CURVE.n;
    const hsPoint = secp.ProjectivePoint.BASE.multiply(hsScalar);
    const K = secp.ProjectivePoint.fromHex(spendPub.slice(2));
    const P = K.add(hsPoint);
    // 7. ethereum address from uncompressed pubkey (strip the 0x04 prefix)
    const Puncomp = P.toRawBytes(false).slice(1);
    const addrHash = hexToBytes(keccak256(Puncomp));
    const stealthAddr = "0x" + bytesToHex(addrHash.slice(-20));

    return {
      address: stealthAddr,
      ephemeralPub: "0x" + bytesToHex(ephPub),
      viewTag: "0x" + viewTag.toString(16).padStart(2, "0"),
    };
  }

  // =============================================================
  // terminal
  // =============================================================
  const terminal = (() => {
    const node = document.getElementById("terminal");
    const out = document.getElementById("term-output");
    const form = document.getElementById("term-form");
    const input = document.getElementById("term-input");
    if (!node || !out || !form || !input)
      return { activate() {}, deactivate() {} };

    node.hidden = false;

    let booted = false;
    const history = [];
    let histIdx = -1;
    let vaultUnlocked = false;
    let rabbitholeRevealed = false; // konami reveals the command; gate still requires zk proof
    let challengeSalt = null; // per-session salt for rabbithole challenge-response
    const commits = new Map(); // label -> { salt, commit }

    function randomHex(n) {
      const bytes = crypto.getRandomValues(new Uint8Array(n));
      return bytesToHex(bytes);
    }
    function ensureChallengeSalt() {
      if (!challengeSalt) challengeSalt = "0x" + randomHex(16);
      return challengeSalt;
    }

    // ----- glitch (matrix-style scrambled text for hidden labels) -----
    const GLITCH_CHARS = "ｱｲｳｴｵｶｷｸｹｺｻｼ0123456789ABCDEFabcdef$%&*+-/\\|<>=?";
    function randomGlitch(n) {
      let s = "";
      for (let i = 0; i < n; i++) {
        s += GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0];
      }
      return s;
    }
    let glitchTimer = null;
    function ensureGlitchTimer() {
      if (glitchTimer) return;
      glitchTimer = setInterval(() => {
        const els = document.querySelectorAll(".glitch");
        if (!els.length) {
          clearInterval(glitchTimer);
          glitchTimer = null;
          return;
        }
        els.forEach((el) => {
          const len = parseInt(el.dataset.len || "10", 10);
          el.textContent = randomGlitch(len);
        });
      }, 90);
    }

    // ----- formatters -----
    function esc(s) {
      return String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
    }
    function head(t) {
      return { html: esc(t), cls: "head" };
    }
    function acc(t) {
      return { html: esc(t), cls: "acc" };
    }
    function muted(t) {
      return { html: esc(t), cls: "muted" };
    }
    function warn(t) {
      return { html: esc(t), cls: "warn" };
    }
    function row(k, v) {
      const vHtml = typeof v === "string" ? esc(v) : v.html;
      return { html: `<span class="muted">${esc(k)}</span>  ${vHtml}` };
    }
    function link(text, href) {
      return {
        html: `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>`,
      };
    }

    // ----- content -----
    const SECTIONS = {
      whoami: () => [
        head("> whoami"),
        "iván mañús murcia · engineer · cypherpunk by ethos",
        "",
        "i picked up solidity and web3 during the pandemic and never",
        "stopped — i read new proposals the way other people read news.",
        "",
        "3+ years at bit2me leading commerce — the product that let",
        "spanish merchants accept crypto for goods and services,",
        "auto-swapped to fiat. as part of the core team i also drove",
        "devrel, integrating its api into banks and exchanges —",
        "€1M+/mo in institutional flow.",
        "",
        "co-author  · EIP-5216 (safe ERC-1155 per-id approvals)",
        "co-founder · escuelacryptoes (spanish-speaking EVM community)",
        "linkedin   · 2,000+ followers · critical, engineer's-eye",
        "             read on ecosystem news",
        "",
        muted("DeFi, privacy and security with the UX they deserve —"),
        muted("for institutions and individuals alike."),
        muted("low-level under the hood. seamless on top."),
        muted("AI is a power tool, not a substitute for judgment."),
      ],

      experience: () => [
        head("> experience"),
        acc("bit2me · commerce principal engineer / devrel"),
        muted("nov 2023 – jan 2026 · remote"),
        "  · led bit2me commerce — crypto payments for spanish merchants,",
        "    auto-swapped to fiat. suite's first lightning product.",
        "  · core team; devrel integrating the API into banks & exchanges",
        "    → 10+ institutional integrations, €1M+/mo flow",
        "",
        acc("bit2me · software support engineer, commerce"),
        muted("nov 2022 – nov 2023 · remote"),
        "  · onboarded 300+ merchants → €300k+ first-year volume",
        "  · bridged product, support, and engineering",
        "",
        acc("corporation for imaging diagnosis and treatment · full-stack"),
        muted("jul 2018 – aug 2020 · spain"),
        "  · php / js / jquery / mysql; analysis → design → deploy",
        "  · hosting, migrations, on-site & remote client support",
      ],

      building: () => {
        const proj = (name, href, scope, pad = 17) => {
          const padding = " ".repeat(Math.max(1, pad - name.length));
          const head = href
            ? `<a href="${esc(href)}" target="_blank" rel="noopener" class="acc">${esc(name)}</a>`
            : `<span class="acc">${esc(name)}</span>`;
          return {
            html: `${head}${padding}<span class="muted">${esc(scope)}</span>`,
          };
        };
        // bauta & r1do — combined card, two distinct links
        const bautaR1do = {
          html:
            `<a href="https://bautawallet.com" target="_blank" rel="noopener" class="acc">bauta</a>` +
            `<span class="muted"> & </span>` +
            `<a href="https://github.com/ivanmmurciaua/R1DO-tools" target="_blank" rel="noopener" class="acc">r1do</a>` +
            `     <span class="muted">privacy suite</span>`,
        };
        return [
          head("> building"),
          proj(
            "escuelacryptoes",
            "https://t.me/EscuelaCrypto_ES",
            "co-founder · community",
          ),
          "  spanish-speaking EVM community. smart-contract dev, testing,",
          "  basic security review, AI/crypto debates.",
          "",
          bautaR1do,
          "  private stealth payments on EVM (ERC-5564 / EIP-6538),",
          "  RAILGUN shielded ops, passkey privacy management.",
          "",
          proj(
            "the great",
            "https://thegreatfi.com/",
            "co-founder · protocol · DeFi",
          ),
          "  DeFi intelligence platform — real-time on-chain data meets",
          "  professional risk criteria.",
          "",
          proj("neuralbridge", null, "co-founder · company · AI"),
          "  embeds AI across the whole company. dynamic interplay between",
          "  AI execution and the team's critical thinking.",
          "",
          proj("kuhana", "https://kuhana.io", "co-founder · app · draft"),
          "  global app for circles of trust with shared finances and savings.",
          "",
          proj("dedelivery", "https://dedelivery.es/", "co-founder · protocol"),
          "  decentralized last-mile delivery on EVM. smart contracts",
          "  coordinate couriers/vendors/customers — no middlemen.",
        ];
      },

      stack: () => [
        head("> stack"),
        row(
          "smart contracts ",
          "solidity · hardhat · openzeppelin · EVM gas/storage opt ·",
        ),
        "                   ERC-20/721/1155",
        "",
        row(
          "privacy & crypto",
          "applied crypto · stealth addrs (ERC-5564/EIP-6538) ·",
        ),
        "                   RAILGUN shielded ops · passkeys · safe · ERC-4337",
        "",
        row(
          "payments rails  ",
          "bitcoin · DeFi flow · standard EVM money flow ·",
        ),
        "                   institutional web2 APIs · crypto-to-fiat ·",
        "                   auto-swaps · cross-chain ops",
        "",
        row("backend         ", "typescript · node.js · python"),
        row("frontend        ", "next.js · vite · react"),
        row("infra           ", "ipfs · waku"),
      ],

      education: () => [
        head("> education"),
        "BSc, IT engineering · universidad de alicante · 2016 – 2022",
        "higher vocational (ASIR), network & systems · IES las espeñetas · 2014 – 2016",
      ],

      contact: () => [
        head("> contact"),
        row("location   ", "spain · remote"),
        row("relocation ", acc("true")),
        "",
        row(
          "github     ",
          link("github.com/ivanmmurciaua", "https://github.com/ivanmmurciaua"),
        ),
        row(
          "x          ",
          link("x.com/ivanmmurcia_", "https://x.com/ivanmmurcia_"),
        ),
        row(
          "telegram   ",
          link("t.me/ivanovish10", "https://t.me/ivanovish10"),
        ),
        row(
          "linkedin   ",
          link("linkedin.com/in/ivan-m-m", "https://linkedin.com/in/ivan-m-m/"),
        ),
        "",
        muted("there are other ways to reach me. you'll know how."),
      ],

      pgp: () => [
        head("> pgp"),
        "fingerprint: E1EC 9F39 4C07 D31D 3D8D  4DA9 D0EB 6C60 764A 1E00",
        "keyserver:   keys.openpgp.org",
        muted(
          "recover:     gpg --recv-keys <fingerprint>  (uid resolves email)",
        ),
      ],

      canary: () => {
        const today = new Date().toISOString().slice(0, 10);
        return [
          head("> warrant canary"),
          acc("status: GREEN"),
          `last verified: ${today}`,
          "",
          "as of the above date, iván has received:",
          "  · no national security letters",
          "  · no gag orders",
          "  · no compelled-disclosure requests",
          "  · no key-escrow demands",
          "",
          warn(
            "if this section disappears or stops updating, assume compromise.",
          ),
        ];
      },

      manifesto: () => {
        // PLACEHOLDER MANIFESTO — iván to replace with his real prose.
        // the 12 red words below ARE the rabbithole secret. format:
        // lowercase, in reading order, space-separated.
        const w = (word) => `<span class="seed">${word}</span>`;
        return [
          head("> manifesto"),
          "",
          {
            html: `  everything begins with a question: who do ${w("we")} trust with our truth? that question shapes every ${w("work")}ing hour, every line of code, every decision about where to participate — and where to protect. i build ${w("in")} layers. visible where i choose. guarded where i must.`,
          },
          "",
          {
            html: `  i have learned to respect ${w("the")} geometry of boundaries. those who move through ${w("dark")}ness — not from fear, but from principle — choose ${w("to")} act rather than perform. silence is not absence.`,
          },
          "",
          {
            html: `  i ${w("serve")} ${w("the")} idea that sovereignty is not a privilege but a practice. that ${w("light")} is not granted from above — it is generated by every person who refuses to outsource their thinking, their data, their truth.`,
          },
          "",
          {
            html: `  ${w("we")} know what we ${w("are")}. ${w("cypherpunks")} don't announce themselves. we build the infrastructure of freedom and let the world decide if it wants to live in it.`,
          },
          "",
        ];
      },

      rabbitholeLocked: () => {
        const salt = ensureChallengeSalt();
        return [
          head("> rabbithole · sealed"),
          "challenge-response. no replays from prior sessions.",
          "",
          {
            html:
              `<span class="muted">session salt:</span>  ` +
              `<span class="acc">${esc(salt)}</span>`,
          },
          "",
          "prove knowledge:",
          acc('  $ rabbithole <sha512(secret + ":" + salt-above)>'),
          "",
          "on valid proof, you see:",
          "  stealth · silent · 0zk · nostr",
          "",
          muted("hint: secret = the 12 red words in my manifesto,"),
          muted("      in reading order, lowercase, space-separated."),
          muted("      run `manifesto` to read them."),
          muted("      same primitive as `commit` — see that demo."),
          "",
          muted('  echo -n "<secret>:<salt>" | shasum -a 512'),
        ];
      },

      rabbitholeUnlocking: () => [
        head("> rabbithole · entered"),
        acc("welcome to wonderland."),
        "",
      ],

      rabbitholeStaticLines: () => [
        row(
          "silent  ",
          "sp1qq04ncgag2ygtfv6dutjfr0dtvk4xfvrs8aur486jt06s0ka5h6v9kqkrukn5wvhg42m3cpz4sqzfd7ja8lsepy6n9r466rncckxy2mgplvhpx73m",
        ),
        row("0zk     ", "—"),
        row(
          "nostr   ",
          "npub1v4nm2zhpqyce2x9uk0lgtf6y0npdz4655j35e3lr52n6hgeyxrasd6f87w",
        ),
        "",
        muted("note: stealth derived locally with noble-secp256k1 from a"),
        muted("      live EIP-6538 registry lookup. zero IP leak beyond the"),
        muted("      RPC call. each visitor gets a unique on-chain address."),
      ],
    };

    // ----- commands -----
    const COMMANDS = {
      help: {
        desc: "list commands",
        run: () => {
          const items = [
            ["whoami", "summary"],
            ["experience", "work history"],
            ["building", "side ventures"],
            ["stack", "tech stack"],
            ["education", "academic background"],
            ["contact", "public contact channels"],
            ["pgp", "pgp fingerprint + keyserver hint"],
            ["canary", "warrant canary"],
            ["manifesto", "what i build for"],
            ["commit", "commit-reveal demo (sha-512)"],
            ["matrix", "toggle bg rain"],
            ["clear", "clear screen"],
            ["solar", "switch theme"],
          ];
          if (rabbitholeRevealed) {
            items.splice(9, 0, ["rabbithole", "the gate. zk-gated reveal"]);
          }
          const lines = [head("> commands")];
          items.forEach(([k, d]) => {
            lines.push({
              html: `<span class="acc">${esc(k.padEnd(16))}</span><span class="muted">${esc(d)}</span>`,
            });
          });
          if (!rabbitholeRevealed) {
            // hidden command — glitch placeholder slot between manifesto and commit
            const init = randomGlitch(10);
            lines.splice(10, 0, {
              html:
                `<span class="acc glitch" data-len="10">${esc(init)}</span>` +
                "      " +
                `<span class="muted">????????????????????????</span>`,
            });
          }
          lines.push("");
          lines.push("aliases: ls, ?, work, ventures, edu, links, cls, exit");
          return lines;
        },
      },
      whoami: { desc: "summary", run: () => SECTIONS.whoami() },
      experience: { desc: "work", run: () => SECTIONS.experience() },
      building: { desc: "ventures", run: () => SECTIONS.building() },
      stack: { desc: "tech", run: () => SECTIONS.stack() },
      education: { desc: "edu", run: () => SECTIONS.education() },
      contact: { desc: "links", run: () => SECTIONS.contact() },
      pgp: { desc: "pgp", run: () => SECTIONS.pgp() },
      canary: { desc: "canary", run: () => SECTIONS.canary() },
      manifesto: { desc: "manifesto", run: () => SECTIONS.manifesto() },

      rabbithole: {
        desc: "fall in (gated by zk challenge-response)",
        run: async (args) => {
          if (!args.length) {
            if (vaultUnlocked) return openRabbitholeLines();
            return SECTIONS.rabbitholeLocked();
          }
          const salt = ensureChallengeSalt();
          // SECRET = 12 red words in `manifesto`, in reading order,
          // lowercase, space-separated. update when manifesto changes.
          const SECRET =
            "we work in the dark to serve the light we are cypherpunks";
          const expected = await sha512Hex(SECRET + ":" + salt);
          const given = args[0].toLowerCase().trim();
          if (given === expected) {
            vaultUnlocked = true;
            return openRabbitholeLines();
          }
          return [warn("err: wrong hash for this session's salt. try again.")];
        },
      },

      commit: {
        desc: "commit-reveal",
        run: async (args) => {
          if (!args.length) {
            return [
              head("> commit-reveal"),
              "primitive of every zk protocol: commit now, reveal later.",
              "",
              acc("  $ commit <label>           # generates salt + commitment"),
              acc("  $ reveal <label> <salt>    # verifies your prior commit"),
              "",
              "commit = sha-512(label || salt). 16-byte random salt.",
            ];
          }
          const label = args[0];
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const saltHex = bytesToHex(salt);
          const commitInput = label + saltHex;
          const commit = await sha512Hex(commitInput);
          commits.set(label, { saltHex, commit });
          return [
            acc("[+] committed."),
            row("label  ", label),
            row("salt   ", "0x" + saltHex),
            row("commit ", "0x" + commit.slice(0, 32) + "..."),
            "",
            "to verify later: reveal " + label + " 0x" + saltHex,
          ];
        },
      },
      reveal: {
        desc: "reveal commit",
        run: async (args) => {
          if (args.length < 2) {
            return [warn("err: usage — reveal <label> <salt-hex>")];
          }
          const [label, saltArg] = args;
          const stored = commits.get(label);
          if (!stored)
            return [warn("err: no commit found for label '" + label + "'")];
          const saltHex = saltArg.replace(/^0x/, "");
          const commit = await sha512Hex(label + saltHex);
          if (commit === stored.commit && saltHex === stored.saltHex) {
            return [acc("[+] verified. commit matches.")];
          }
          return [warn("err: commit mismatch. either wrong salt or label.")];
        },
      },

      matrix: {
        desc: "toggle bg",
        run: (args) => {
          const canvas = document.getElementById("matrix-bg");
          if (!canvas) return [warn("no canvas.")];
          const on = args[0] !== "off" && canvas.style.display !== "none";
          canvas.style.display = on ? "none" : "";
          return ["matrix " + (on ? "off" : "on")];
        },
      },
      clear: {
        desc: "clear",
        run: () => {
          out.innerHTML = "";
          return null;
        },
      },
      solar: {
        desc: "theme",
        run: () => {
          setTheme("solar");
          return null;
        },
      },
    };

    const ALIASES = {
      about: "whoami",
      work: "experience",
      ventures: "building",
      edu: "education",
      links: "contact",
      cls: "clear",
      exit: "solar",
      ls: "help",
      "?": "help",
    };

    async function openRabbitholeLines() {
      const opening = SECTIONS.rabbitholeUnlocking();
      print(opening);
      print([
        {
          html: '<span class="muted">[~]</span> querying EIP-6538 registry...',
        },
      ]);
      let stealthBlock;
      try {
        const s = await deriveStealth();
        stealthBlock = [
          row("stealth ", s.address),
          row("  ephK  ", s.ephemeralPub),
          row("  vtag  ", s.viewTag),
        ];
      } catch (e) {
        stealthBlock = [
          warn("[!] stealth derivation failed: " + e.message),
          muted("    retry in a moment or report if persistent."),
        ];
      }
      return stealthBlock.concat(SECTIONS.rabbitholeStaticLines());
    }

    // ----- rendering -----
    function print(lines) {
      if (!lines) return;
      const arr = Array.isArray(lines) ? lines : [lines];
      for (const ln of arr) {
        const div = document.createElement("div");
        if (ln === "" || ln == null) {
          div.className = "blank";
        } else if (typeof ln === "string") {
          div.className = "line";
          div.textContent = ln;
        } else {
          div.className = "line " + (ln.cls || "");
          div.innerHTML = ln.html;
        }
        out.appendChild(div);
      }
      if (out.querySelector(".glitch")) ensureGlitchTimer();
      scrollDown();
    }
    function echo(cmd) {
      const div = document.createElement("div");
      div.className = "line";
      div.innerHTML = `<span class="prompt-echo">imm@cv:~$&nbsp;</span>${esc(cmd)}`;
      out.appendChild(div);
    }
    function scrollDown() {
      out.scrollTop = out.scrollHeight;
    }

    // ----- boot -----
    async function boot() {
      if (booted) return;
      booted = true;
      const today = new Date().toISOString().slice(0, 10);
      const ok = (label) => ({
        html: `<span class="acc">[+]</span> ${esc(label)}`,
      });
      const lines = [
        muted("imm.cv · privacy-first cv · v1.0"),
        muted("ephemeral session · no storage · no trackers"),
        "",
        ok("loading entropy ............ ok"),
        ok("verifying signatures ....... ok"),
        ok("legacy cheats .............. accepted"),
        ok("warrant canary ............. GREEN (" + today + ")"),
        "",
        {
          html: `type <span class="acc">help</span> to begin · <span class="acc">solar</span> to exit`,
        },
        "",
      ];
      for (const ln of lines) {
        print([ln]);
        await sleep(70);
      }
    }
    function sleep(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }

    // ----- input handling -----
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const raw = input.value.trim();
      input.value = "";
      echo(raw);
      if (!raw) return;

      history.push(raw);
      histIdx = history.length;

      const [name, ...args] = raw.split(/\s+/);
      const key = ALIASES[name.toLowerCase()] || name.toLowerCase();
      const cmd = COMMANDS[key];
      if (!cmd) {
        print([
          warn(`err: command not found: ${name}`),
          muted("type 'help' for the list."),
        ]);
        return;
      }
      try {
        const out_ = await cmd.run(args);
        print(out_);
      } catch (err) {
        print([warn("err: " + (err.message || err))]);
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        if (history.length && histIdx > 0) histIdx--;
        input.value = history[histIdx] || "";
        requestAnimationFrame(() => input.setSelectionRange(99, 99));
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (histIdx < history.length - 1) {
          histIdx++;
          input.value = history[histIdx];
        } else {
          histIdx = history.length;
          input.value = "";
        }
        e.preventDefault();
      } else if (e.key === "l" && e.ctrlKey) {
        out.innerHTML = "";
        e.preventDefault();
      }
    });

    node.addEventListener("click", (e) => {
      if (e.target.tagName === "A") return;
      input.focus();
    });

    // konami → reveals the existence of `rabbithole` in help.
    // does NOT bypass the gate. you still need to compute the proof.
    const KONAMI = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];
    let konamiBuf = [];
    document.addEventListener("keydown", async (e) => {
      if (root.getAttribute("data-theme") !== "lunar") return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      konamiBuf.push(key);
      konamiBuf = konamiBuf.slice(-KONAMI.length);
      if (konamiBuf.join(",") !== KONAMI.join(",")) return;
      konamiBuf = [];
      if (rabbitholeRevealed) {
        print([muted(""), muted("[~] you already found the white rabbit.")]);
        return;
      }
      rabbitholeRevealed = true;
      // dramatic sequence: lock input → ramp matrix → flash → (swap behind green) → unlock
      input.disabled = true;
      input.blur();
      try {
        await matrix.dramatic(() => {
          // runs while screen is at full green (visitor sees nothing else)
          out.innerHTML = "";
          print([
            "",
            acc("[!] you found the white rabbit."),
            muted("new command in help. but the gate still requires proof."),
            "",
          ]);
        });
      } finally {
        input.disabled = false;
        requestAnimationFrame(() => input.focus());
      }
    });

    function activate() {
      node.hidden = false;
      body.classList.add("term-mode");
      boot();
      requestAnimationFrame(() => input.focus());
    }
    function deactivate() {
      body.classList.remove("term-mode");
    }

    return { activate, deactivate };
  })();

  // ----- init -----
  applyTheme(pickTheme());

  // easter egg — message depends on which theme the visitor loaded
  const _theme = pickTheme();
  const _msg =
    _theme === "lunar"
      ? "\n" +
        "welcome to the rabbit hole.\n" +
        "ps. the old codes still work.\n"
      : "\n" +
        "wake up, friend...\n" +
        "the cv has you.\n" +
        "\n" +
        "follow the green rain.\n" +
        "knock, knock  →  ?theme=lunar\n";
  const _color = "#39ff14";
  // eslint-disable-next-line no-console
  console.log(
    "%c" + _msg,
    `color:${_color};font-family:monospace;font-size:13px;`,
  );
})();
