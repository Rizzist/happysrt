let _instance = null;
let _loadingPromise = null;

function isBrowser() {
  return typeof window !== "undefined";
}

export async function loadFfmpegSingleton({ onLog } = {}) {
  if (!isBrowser()) return null; // never load during SSR
  if (_instance) return _instance;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    // New API: FFmpeg + toBlobURL (recommended)
    const [{ FFmpeg }, { toBlobURL, fetchFile }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ]);

    const ffmpeg = new FFmpeg();

    // Optional log hook
    if (typeof onLog === "function") {
      ffmpeg.on("log", onLog);
    }

    // You can override via env if you want
    // Example: NEXT_PUBLIC_FFMPEG_BASE_URL=https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd
    const baseURL =
      process.env.NEXT_PUBLIC_FFMPEG_BASE_URL ||
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

    // Per docs: load coreURL/wasmURL using blob URLs
    // (this avoids common CORS issues when fetching WASM assets) :contentReference[oaicite:2]{index=2}
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm");

    await ffmpeg.load({ coreURL, wasmURL });

    _instance = { ffmpeg, fetchFile };
    console.log("[ffmpeg] ready");
    return _instance;
  })();

  return _loadingPromise;
}

// --- Optional helpers you can use later (not wired into UI yet) ---

function safeName(name) {
  const base = String(name || "input").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.length ? base : "input";
}

export async function extractAudioToMp3(file) {
  const loaded = await loadFfmpegSingleton();
  if (!loaded) throw new Error("FFmpeg not available (SSR?)");

  const { ffmpeg, fetchFile } = loaded;

  const inName = `${Date.now()}_${safeName(file?.name || "input")}`;
  const outName = `${Date.now()}_output.mp3`;

  await ffmpeg.writeFile(inName, await fetchFile(file));
  // -vn: no video, -q:a 0: high quality VBR
  await ffmpeg.exec(["-i", inName, "-vn", "-q:a", "0", outName]);

  const data = await ffmpeg.readFile(outName);
  const blob = new Blob([data.buffer], { type: "audio/mpeg" });
  const mp3File = new File([blob], "output.mp3", { type: "audio/mpeg" });

  return {
    file: mp3File,
    blob,
    url: URL.createObjectURL(blob),
  };
}

export function getMediaDurationSeconds(fileOrUrl) {
  // Works for audio/video; uses native media metadata (fast + no ffmpeg needed)
  return new Promise((resolve, reject) => {
    const el = document.createElement("audio");
    el.preload = "metadata";

    el.onloadedmetadata = () => {
      const d = Number(el.duration);
      if (Number.isFinite(d)) resolve(d);
      else reject(new Error("Could not read duration"));
    };

    el.onerror = () => reject(new Error("Failed to load media metadata"));

    if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
      el.src = URL.createObjectURL(fileOrUrl);
    } else {
      el.src = String(fileOrUrl || "");
    }
  });
}
