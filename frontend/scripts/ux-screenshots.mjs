import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.UX_BASE_URL ?? "http://localhost:3000";
const API_BASE_URL = process.env.UX_API_BASE_URL ?? "http://localhost:5000/api";
const OUT_DIR =
  process.env.UX_OUT_DIR ??
  path.resolve(process.cwd(), "..", ".gstack", "ux-screenshots");

const PAGES = [
  // main app (after login)
  { name: "wizard", url: "/" },
  { name: "my-orders", url: "/my-orders" },
  { name: "inventory", url: "/inventory" },
  // admin app (after login)
  { name: "admin-dashboard", url: "/admin/dashboard" },
];

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 }, // iPhone 12-ish
  { name: "tablet", width: 768, height: 1024 }, // iPad portrait
  { name: "desktop", width: 1440, height: 900 },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeName(s) {
  return s.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
}

const joinUrl = (base, p) =>
  new URL(p, base.endsWith("/") ? base : `${base}/`).toString();

ensureDir(OUT_DIR);

const browser = await chromium.launch();
try {
  // MAIN APP AUTH (location user)
  // NOTE: some seeded users may be legacy/overwritten; NORD is reliably present in this DB
  const MAIN_USERNAME = process.env.UX_MAIN_USERNAME ?? "NORD";
  const MAIN_PASSWORD = process.env.UX_MAIN_PASSWORD ?? "0000";

  // ADMIN AUTH
  const ADMIN_USERNAME = process.env.UX_ADMIN_USERNAME ?? "admin";
  const ADMIN_PASSWORD = process.env.UX_ADMIN_PASSWORD ?? "0000";

  const loginViaApi = async ({ username, password, loginContext }) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        loginContext ? { username, password, loginContext } : { username, password },
      ),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`API login failed (${res.status}): ${txt || res.statusText}`);
    }
    return await res.json();
  };

  const fetchGlobalConfig = async (token) => {
    const res = await fetch(`${API_BASE_URL}/auth/config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Config fetch failed (${res.status}): ${txt || res.statusText}`);
    }
    return await res.json();
  };

  // Pre-fetch tokens once (stable across viewports)
  const mainAuth = await loginViaApi({
    username: MAIN_USERNAME,
    password: MAIN_PASSWORD,
  });
  const mainToken = mainAuth.token || mainAuth?.user?.username;
  const mainUserId = mainAuth?.user?.id;
  const globalConfig = await fetchGlobalConfig(mainToken);

  const adminAuth = await loginViaApi({
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    loginContext: "admin",
  });
  const adminToken = adminAuth.token || adminAuth?.user?.username;

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // Seed auth into localStorage before first page load (more reliable than UI login)
    await context.addInitScript(
      ({ mainToken, mainUserId, globalConfig, adminToken }) => {
        localStorage.setItem("authToken", mainToken);
        if (mainUserId) localStorage.setItem("userId", mainUserId);
        localStorage.setItem("globalConfig", JSON.stringify(globalConfig ?? {}));
        localStorage.setItem("adminAuthToken", adminToken);
      },
      { mainToken, mainUserId, globalConfig, adminToken },
    );

    // Capture login screens too (important UX surface)
    for (const p of [
      { name: "login", url: "/login" },
      { name: "admin-login", url: "/admin/" },
    ]) {
      const url = joinUrl(BASE_URL, p.url);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);
      const file = path.join(OUT_DIR, `${safeName(p.name)}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      // eslint-disable-next-line no-console
      console.log(`${p.name} (${vp.name}): ${file}`);
    }

    // 2) Capture MAIN app pages
    for (const p of PAGES.filter((x) => !x.name.startsWith("admin-"))) {
      const url = joinUrl(BASE_URL, p.url);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);

      const file = path.join(OUT_DIR, `${safeName(p.name)}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      // eslint-disable-next-line no-console
      console.log(`${p.name} (${vp.name}): ${file}`);
    }

    // 4) Capture ADMIN pages
    for (const p of PAGES.filter((x) => x.name.startsWith("admin-"))) {
      const url = joinUrl(BASE_URL, p.url);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);

      const file = path.join(OUT_DIR, `${safeName(p.name)}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      // eslint-disable-next-line no-console
      console.log(`${p.name} (${vp.name}): ${file}`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}

