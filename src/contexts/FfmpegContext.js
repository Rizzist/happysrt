import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { extractAudioToMp3, getMediaDurationSeconds, loadFfmpegSingleton } from "../lib/ffmpegClient";

const FfmpegContext = createContext(null);

export function FfmpegProvider({ children }) {
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(true);
  const [ffmpegError, setFfmpegError] = useState(null);

  // avoid strict-mode double load
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        setFfmpegLoading(true);
        setFfmpegError(null);

        await loadFfmpegSingleton({
          onLog: (e) => {
            // e.message exists in ffmpeg wasm logs
            if (e?.message) console.log("[ffmpeg]", e.message);
          },
        });

        if (!cancelled) setFfmpegReady(true);
      } catch (err) {
        console.error("[ffmpeg] failed to load", err);
        if (!cancelled) setFfmpegError(err?.message || "Failed to load FFmpeg");
      } finally {
        if (!cancelled) setFfmpegLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      ffmpegReady,
      ffmpegLoading,
      ffmpegError,

      // keep these available for later features
      extractAudioToMp3,
      getMediaDurationSeconds,
      ensureFfmpeg: () => loadFfmpegSingleton(),
    }),
    [ffmpegReady, ffmpegLoading, ffmpegError]
  );

  return <FfmpegContext.Provider value={value}>{children}</FfmpegContext.Provider>;
}

export function useFfmpeg() {
  const ctx = useContext(FfmpegContext);
  if (!ctx) throw new Error("useFfmpeg must be used inside <FfmpegProvider />");
  return ctx;
}
