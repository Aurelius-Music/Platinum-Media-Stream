import { useRef, useState, useEffect, useCallback } from "react";
import { LocalVideoTrack, LocalAudioTrack } from "livekit-client";
// SelfieSegmentation is loaded via <script> in index.html (window.SelfieSegmentation).

export function useMediaControls({ backgroundImageUrl } = {}) {
  const videoElRef = useRef(null);
  const canvasRef = useRef(null);
  const camStreamRef = useRef(null);
  const segmenterRef = useRef(null);
  const rafRef = useRef(null);
  const bgImageRef = useRef(null);
  const bgModeRef = useRef("none");
  const switchingRef = useRef(false);
  const facingRef = useRef("user");
  const blackoutRef = useRef(false);
  const [blackout, setBlackoutState] = useState(false);
  const setBlackout = useCallback((on) => {
    blackoutRef.current = on;
    setBlackoutState(on);
  }, []);

  const [bgMode, setBgModeState] = useState("none");
  const [processedVideoTrack, setProcessedVideoTrack] = useState(null);
  const [debugError, setDebugError] = useState(null);
  const [facing, setFacing] = useState("user");

  const setBgMode = useCallback((mode) => {
    bgModeRef.current = mode;
    setBgModeState(mode);
  }, []);

  const setBackgroundImage = useCallback((urlOrFile) => {
    const url =
      typeof urlOrFile === "string" ? urlOrFile : URL.createObjectURL(urlOrFile);
    const img = new Image();
    img.onload = () => {
      bgImageRef.current = img;
    };
    img.onerror = () => setDebugError("Background image failed to load.");
    img.src = url;
  }, []);

  const openCamera = (facingMode) =>
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 16 / 9 },
      },
    });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let camStream, videoEl, canvas, ctx;

      try {
        camStream = await openCamera("user");
        camStreamRef.current = camStream;
        videoEl = document.createElement("video");
        videoEl.srcObject = camStream;
        videoEl.muted = true;
        videoEl.playsInline = true;
        await videoEl.play();
        videoElRef.current = videoEl;

        const s = camStream.getVideoTracks()[0].getSettings();
        canvas = document.createElement("canvas");
        canvas.width = s.width || videoEl.videoWidth || 1280;
        canvas.height = s.height || videoEl.videoHeight || 720;
        canvasRef.current = canvas;
        ctx = canvas.getContext("2d");
      } catch (err) {
        console.error("Camera capture failed:", err);
        setDebugError(`Camera error: ${err.message || err}`);
        return;
      }

      if (backgroundImageUrl) setBackgroundImage(backgroundImageUrl);

      try {
        if (!window.SelfieSegmentation) {
          throw new Error("SelfieSegmentation script not loaded (index.html)");
        }
        const segmenter = new window.SelfieSegmentation({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });
        segmenter.setOptions({ modelSelection: 1 });

        segmenter.onResults((results) => {
          if (cancelled) return;
          if (blackoutRef.current) {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
          }
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = "source-in";
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = "destination-over";
          const mode = bgModeRef.current;
          if (mode === "blur") {
            ctx.filter = "blur(12px)";
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            ctx.filter = "none";
          } else if (mode === "image" && bgImageRef.current) {
            ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
          } else {
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
          }
          ctx.restore();
        });

        segmenterRef.current = segmenter;

        const renderLoop = async () => {
          if (cancelled) return;
          try {
            if (!switchingRef.current && videoEl.readyState >= 2) {
              await segmenter.send({ image: videoEl });
            }
          } catch (err) {
            console.error("Segmenter frame error:", err);
            setDebugError(`Segmenter frame error: ${err.message || err}`);
          }
          rafRef.current = requestAnimationFrame(renderLoop);
        };
        renderLoop();
      } catch (err) {
        console.error("Segmenter init failed, using passthrough:", err);
        setDebugError(`Segmenter init failed: ${err.message || err}`);
        const fallbackLoop = () => {
          if (cancelled) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (blackoutRef.current) {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          } else {
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          }
          rafRef.current = requestAnimationFrame(fallbackLoop);
        };
        fallbackLoop();
      }

      const canvasStream = canvas.captureStream(30);
      setProcessedVideoTrack(new LocalVideoTrack(canvasStream.getVideoTracks()[0]));
    }

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      segmenterRef.current?.close();
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Swap the camera that feeds the canvas. The published track stays the same.
  const switchCamera = useCallback(async () => {
    if (switchingRef.current) return;
    const videoEl = videoElRef.current;
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;
    switchingRef.current = true;
    const oldStream = camStreamRef.current;
    const next = facingRef.current === "user" ? "environment" : "user";
    try {
      oldStream?.getTracks().forEach((t) => t.stop());
      let newStream;
      try {
        newStream = await openCamera(next);
      } catch (err) {
        // restore the previous camera so the video never stays black
        newStream = await openCamera(facingRef.current);
        setDebugError(`Camera flip failed: ${err.message || err}`);
      }
      camStreamRef.current = newStream;
      videoEl.srcObject = newStream;
      await videoEl.play();
      const s = newStream.getVideoTracks()[0].getSettings();
      const w = s.width || videoEl.videoWidth;
      const h = s.height || videoEl.videoHeight;
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
      const actual = s.facingMode === "environment" || s.facingMode === "user" ? s.facingMode : next;
      facingRef.current = actual;
      setFacing(actual);
    } catch (err) {
      console.error("switchCamera failed:", err);
      setDebugError(`Camera flip error: ${err.message || err}`);
    } finally {
      switchingRef.current = false;
    }
  }, []);

  const audioCtxRef = useRef(null);
  const musicElRef = useRef(null);
  const musicBlobRef = useRef(null);
  const musicGainRef = useRef(null);
  const sfxGainRef = useRef(null);
  const [processedAudioTrack, setProcessedAudioTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);

  useEffect(() => {
    let cancelled = false;

    async function initAudio() {
      try {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
          },
        });
        const micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.channelCount = 1;
        micSource.channelCountMode = "explicit";
        micSource.channelInterpretation = "speakers";

        const musicEl = document.createElement("audio");
        musicEl.style.display = "none";
        musicEl.setAttribute("playsinline", "");
        musicEl.preload = "auto";
        musicEl.onended = () => setIsPlaying(false);
        document.body.appendChild(musicEl);
        musicElRef.current = musicEl;

        const musicSource = audioCtx.createMediaElementSource(musicEl);
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = volume;
        musicGain.channelCount = 1;
        musicGain.channelCountMode = "explicit";
        musicGain.channelInterpretation = "speakers";
        musicGainRef.current = musicGain;
        musicSource.connect(musicGain);

        const sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 0.9;
        sfxGain.channelCount = 1;
        sfxGain.channelCountMode = "explicit";
        sfxGain.channelInterpretation = "speakers";
        sfxGainRef.current = sfxGain;

        const limiter = audioCtx.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.knee.value = 6;
        limiter.ratio.value = 4;
        limiter.attack.value = 0.02;
        limiter.release.value = 0.3;
        limiter.channelCount = 1;
        limiter.channelCountMode = "explicit";
        limiter.channelInterpretation = "speakers";

        const destination = audioCtx.createMediaStreamDestination();
        destination.channelCount = 1;
        destination.channelCountMode = "explicit";
        destination.channelInterpretation = "speakers";

        micSource.connect(limiter);
        musicGain.connect(limiter);
        sfxGain.connect(limiter);
        limiter.connect(destination);

        if (!cancelled) {
          setProcessedAudioTrack(new LocalAudioTrack(destination.stream.getAudioTracks()[0]));
        }
      } catch (err) {
        console.error("Audio init failed:", err);
        setDebugError(`Audio error: ${err.message || err}`);
      }
    }

    initAudio();
    return () => {
      cancelled = true;
      audioCtxRef.current?.close();
      if (musicElRef.current) musicElRef.current.remove();
    };
  }, []);

  const ensureAudioRunning = useCallback(async () => {
    const ctx = audioCtxRef.current;
    if (!ctx) throw new Error("Audio not ready yet — wait a second and retry");
    if (ctx.state !== "running") await ctx.resume();
    if (ctx.state !== "running") throw new Error("Browser blocked audio — tap again");
  }, []);

  const loadTrack = useCallback(async (urlOrFile) => {
    const el = musicElRef.current;
    if (!el) {
      setDebugError("Music player not ready yet — retry in a second");
      return;
    }
    try {
      let blob = urlOrFile;
      if (typeof urlOrFile === "string") {
        const res = await fetch(urlOrFile);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();
      }
      if (musicBlobRef.current) URL.revokeObjectURL(musicBlobRef.current);
      const url = URL.createObjectURL(blob);
      musicBlobRef.current = url;
      el.pause();
      setIsPlaying(false);
      el.src = url;
      el.load();
      await new Promise((resolve, reject) => {
        const ok = () => { el.removeEventListener("error", bad); resolve(); };
        const bad = () => { el.removeEventListener("canplay", ok); reject(new Error("Could not decode this audio file")); };
        el.addEventListener("canplay", ok, { once: true });
        el.addEventListener("error", bad, { once: true });
      });
      setDebugError(null);
    } catch (err) {
      console.error("Failed to load track:", err);
      setDebugError(`Track load failed: ${err.message || err}`);
    }
  }, []);

  const play = useCallback(async () => {
    try {
      await ensureAudioRunning();
      const el = musicElRef.current;
      if (!el || !el.src) throw new Error("Load a track first");
      await el.play();
      setIsPlaying(true);
      setDebugError(null);
    } catch (err) {
      console.error("Music play failed:", err);
      setDebugError(`Music play failed: ${err.message || err}`);
      setIsPlaying(false);
    }
  }, [ensureAudioRunning]);

  const pause = useCallback(() => {
    musicElRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    if (musicGainRef.current) musicGainRef.current.gain.value = v;
  }, []);

  const playSfx = useCallback(async (url) => {
    try {
      await ensureAudioRunning();
      if (!sfxGainRef.current) throw new Error("SFX bus not ready");
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const el = document.createElement("audio");
      el.src = blobUrl;
      el.setAttribute("playsinline", "");
      document.body.appendChild(el);

      const source = audioCtxRef.current.createMediaElementSource(el);
      source.channelCount = 1;
      source.channelCountMode = "explicit";
      source.channelInterpretation = "speakers";
      source.connect(sfxGainRef.current);

      const cleanup = () => {
        try { source.disconnect(); } catch (e) {}
        el.remove();
        URL.revokeObjectURL(blobUrl);
      };
      el.onended = cleanup;
      el.onerror = cleanup;
      await el.play();
    } catch (err) {
      console.error("SFX failed:", err);
      setDebugError(`SFX error: ${err.message || err}`);
    }
  }, [ensureAudioRunning]);

  return {
    videoTrack: processedVideoTrack,
    audioTrack: processedAudioTrack,
    bgMode,
    setBgMode,
    setBackgroundImage,
    music: { loadTrack, play, pause, isPlaying, volume, setVolume },
    sfx: { play: playSfx },
    camera: { switchCamera, facing },
    blackout: { on: blackout, set: setBlackout },
    debugError,
  };
}
