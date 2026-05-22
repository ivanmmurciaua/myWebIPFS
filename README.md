# cv — iván mañús murcia

Personal site / CV. Pure HTML + CSS + ES-module JS. No build step, no framework, no trackers. Designed to be deployable to IPFS as-is.

Two themes:
- `solar` (default) — quiet, readable, recruiter-friendly CV.
- `lunar` — cypherpunk terminal over a matrix-rain background. Boot sequence, warrant canary, interactive commands. Toggle via `?theme=lunar` or `?theme=solar`. Without JS, lunar falls back to the plain CV.

## Network behaviour (honest)

On **page load**: zero external network calls. All fonts and scripts are vendored under `fonts/` and `vendor/`.

On `rabbithole` **command in lunar** (the lunar gate): one JSON-RPC `eth_call` to `https://arb-one.api.pocket.network` (Arbitrum One) to read Iván's stealth meta-address from the [ERC-6538 singleton registry](https://eips.ethereum.org/EIPS/eip-6538) (same address on every chain). A fresh stealth address is then derived **locally** with `noble-secp256k1`. If the RPC fails, that line of the vault fails loudly — no silent fallback. Every other vault entry is static.

## Vendored dependencies

| Path | Source | Purpose |
|---|---|---|
| `vendor/noble-secp256k1.js` | [@noble/secp256k1@2.1.0](https://github.com/paulmillr/noble-secp256k1) by Paul Miller (MIT) | secp256k1 ECDH + point arithmetic for ERC-5564 stealth derivation |
| `vendor/sha3.js` | [js-sha3@0.9.3](https://github.com/emn178/js-sha3) by Chen Yi-Cyuan (MIT) | keccak256 for stealth meta-address hashing and registry function selector |
| `fonts/jetbrains-mono.woff2` | JetBrains Mono variable font via [fontsource](https://github.com/fontsource/fontsource) (OFL) | terminal mono |
| `fonts/inter.woff2` | Inter variable font via fontsource (OFL) | solar body text |

Each dep is small, audited, and well-maintained. They are vendored so that the site has zero runtime dependency on third-party CDNs.

## Local preview

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## IPFS deploy

```sh
ipfs add -r .
# then pin the CID with your provider (web3.storage, pinata, fleek)
# and optionally point an ENS contenthash at it.
```

Static hosts (Cloudflare Pages, Netlify, GitHub Pages) work with zero config — there's no build.
