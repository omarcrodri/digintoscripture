/* DigIntoScripture offline cache. Build 20261001-bg (rev c3299a432b). Same-origin app files + viewed map tiles only. */
'use strict';
const BUILD = '20261001-bg', REV = 'c3299a432b';
const CORE = 'dis-core-' + BUILD + '-' + REV;
const RT = 'dis-rt-' + BUILD + '-' + REV;
const TILES = 'dis-tiles-' + BUILD + '-' + REV;
const KEEP = [CORE, RT, TILES];
const PRECACHE = [
"./",
"./artifacts.geojson",
"./biblical-place-strongs.json",
"./brand/favicon-16.png",
"./brand/favicon-32.png",
"./brand/favicon.ico",
"./brand/logo-app-192.png",
"./brand/logo-app.png",
"./breakout-pastors.geojson",
"./cctv-webcams.json",
"./charlie-kirk.geojson",
"./claims-index.json",
"./creature-finds.geojson",
"./data/hidden-claims.json",
"./data/kjv.json",
"./discover-paths.json",
"./empire-snapshots.geojson",
"./flood-traditions.geojson",
"./index.html",
"./jesus-death-sources.geojson",
"./ken-ham.geojson",
"./manifest.webmanifest",
"./ministries.geojson",
"./ministry-places.geojson",
"./mission-trips.json",
"./name-history.json",
"./oriental-findings.geojson",
"./pin-travel-advisory.json",
"./relics.geojson",
"./search-aliases.json",
"./search-terms.json",
"./site-galleries.json",
"./sponsor-rhb.geojson",
"./temple-mount.geojson",
"./tetragrammaton-display.json",
"./travel-advisory-fills.geojson",
"./tribal-allotments.geojson",
"./vendor/MarkerCluster.Default.css",
"./vendor/MarkerCluster.css",
"./vendor/leaflet.css",
"./vendor/leaflet.js",
"./vendor/leaflet.markercluster.js",
"./vendor/maplibre/leaflet-maplibre-gl.js",
"./vendor/maplibre/maplibre-gl.css",
"./vendor/maplibre/maplibre-gl.js",
"./vendor/marker-icon-2x.png",
"./vendor/marker-icon.png",
"./vendor/marker-shadow.png",
"./vendor/noto-sans-phoenician/NotoSansPhoenician-Regular.ttf",
"./visitor-rules.json"
];
/* Map tile and map-style hosts only. Link-out pages, cams, videos and embeds are never cached. */
const TILE_RX = [
  /^https:\/\/tile\.openstreetmap\.org\//,
  /^https:\/\/[abc]\.tile\.opentopomap\.org\//,
  /^https:\/\/dh\.gu\.se\/tiles\/imperium\//,
  /^https:\/\/tiles\.arcgis\.com\/tiles\/8lB32dT1LAPsoSlg\/arcgis\/rest\/services\/PEF_Map\/MapServer\/tile\//,
  /^https:\/\/tiles\.openfreemap\.org\//
];
/* Viewed tiles only (no bulk download); oldest dropped past the cap. */
const TILE_MAX = 3000;
const IMMUTABLE_RX = /^https:\/\/tiles\.openfreemap\.org\/(planet\/[^/]+\/|fonts\/|sprites\/|natural_earth\/)/;
let putCount = 0;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const c = await caches.open(CORE);
    for (const u of PRECACHE) {
      try { const r = await fetch(new Request(u, { cache: 'reload' })); if (r.ok) await c.put(u, r); } catch (e) {}
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.indexOf('dis-') === 0 && KEEP.indexOf(k) < 0) await caches.delete(k);
    await self.clients.claim();
  })());
});
async function trimTiles(c) {
  const keys = await c.keys();
  for (let i = 0; i < keys.length - TILE_MAX; i++) await c.delete(keys[i]);
}
async function putTile(req, res) {
  try {
    const c = await caches.open(TILES); await c.put(req, res);
    if (++putCount % 50 === 0) trimTiles(c);
  } catch (e) {}
}
async function tileFetch(req) {
  const url = req.url;
  const corsReq = new Request(url, { mode: 'cors', credentials: 'omit' });
  const cached = () => caches.match(url, { cacheName: TILES });
  if (IMMUTABLE_RX.test(url)) { const hit = await cached(); if (hit) return hit; }
  try {
    const res = await fetch(corsReq);
    if (res && res.ok) putTile(url, res.clone());
    return res;
  } catch (e) {
    const hit = await cached(); if (hit) return hit;
    try { return await fetch(req); } catch (e2) { return Response.error(); }
  }
}
function scopePath() { return new URL(self.registration.scope).pathname; }
async function appFetch(req, url) {
  const isData = req.mode === 'navigate' || /\.(html|json|geojson|webmanifest)$/.test(url.pathname) || url.pathname === scopePath();
  if (isData) {
    try {
      const res = await fetch(req);
      if (res && res.ok) { const c = await caches.open(RT); c.put(url.pathname, res.clone()); }
      return res;
    } catch (e) {
      const hit = (await caches.match(url.pathname, { cacheName: RT })) || (await caches.match(url.href, { ignoreSearch: true }));
      if (hit) return hit;
      if (req.mode === 'navigate') { const idx = await caches.match(new URL('index.html', self.registration.scope).href); if (idx) return idx; }
      return Response.error();
    }
  }
  const hit = await caches.match(url.href, { ignoreSearch: true });
  if (hit) return hit;
  try { const res = await fetch(req); if (res && res.ok) { const c = await caches.open(RT); c.put(url.href, res.clone()); } return res; }
  catch (e) { return Response.error(); }
}
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.indexOf(scopePath()) === 0) {
    if (url.pathname.endsWith('/sw.js')) return;
    event.respondWith(appFetch(req, url));
    return;
  }
  if (TILE_RX.some(rx => rx.test(req.url))) event.respondWith(tileFetch(req));
  /* anything else (link-outs, cams, videos, embeds): not intercepted, never cached */
});
