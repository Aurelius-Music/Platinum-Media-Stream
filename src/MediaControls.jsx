import { useRef, useState, useEffect, useCallback } from "react";
import { LocalVideoTrack, LocalAudioTrack } from "livekit-client";
// Note: no npm import for SelfieSegmentation — it's loaded via <script> in
// index.html and used as window.SelfieSegmentation. This avoids the Vite
// minification bug that broke the named npm import in production builds.

export function useMediaControls({ backgroundImageUrl } = {}) {
  const videoElRef = useRef(null);
  const canvasRef = useRef(null);
  const camStreamRef = useRef(null);
  const facingRef = useRef("user");
  const switchingRef = useRef(false);
  const segmenterRef = useRef(null);
  const rafRef = useRef(null);
  const bgImageRef = useRef(null);
  const bgModeRef = useRef("none");

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
    img.onerror = (err) => {
      console.error("Failed to load background image:", err);
      setDebugError("Background image failed to load.");
    };
    img.src = url;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let camStream, videoEl, canvas, ctx;

      try {
        camStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 16 / 9 },
          },
        });
        camStreamRef.current = camStream;
        videoEl = document.createElement("video");
        videoEl.srcObject = camStream;
        videoEl.muted = true;
        videoEl.playsInline = true;
        await videoEl.play();
        videoElRef.current = videoEl;

        const settings = camStream.getVideoTracks()[0].getSettings();
        const actualWidth = settings.width || videoEl.videoWidth || 1280;
        const actualHeight = settings.height || videoEl.videoHeight || 720;

        canvas = document.createElement("canvas");
        canvas.width = actualWidth;
        canvas.height = actualHeight;
        canvasRef.current = canvas;
        ctx = canvas.getContext("2d");
      } catch (err) {
        console.error("Camera capture failed:", err);
        setDebugError(`Camera error: ${err.message || err}`);
        return;
      }

      if (backgroundImageUrl) {
        setBackgroundImage(backgroundImageUrl);
      }

      try {
        if (!window.SelfieSegmentation) {
          throw new Error(
            "SelfieSegmentation script not loaded — check index.html CDN script tag"
          );
        }

        const segmenter = new window.SelfieSegmentation({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });
        segmenter.setOptions({ modelSelection: 1 });

        segmenter.onResults((results) => {
          if (cancelled) return;
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
            await segmenter.send({ image: videoEl });
          } catch (err) {
            console.error("Segmenter frame error:", err);
            setDebugError(`Segmenter frame error: ${err.message || err}`);
          }
          rafRef.current = requestAnimationFrame(renderLoop);
        };
        renderLoop();
      } catch (err) {
        console.error(
          "Segmenter failed to initialize — falling back to raw camera passthrough:",
          err
        );
        setDebugError(`Segmenter init failed: ${err.message || err}`);
        const fallbackLoop = () => {
          if (cancelled) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          rafRef.current = requestAnimationFrame(fallbackLoop);
        };
        fallbackLoop();
      }

      const canvasStream = canvas.captureStream(30);
      const track = new LocalVideoTrack(canvasStream.getVideoTracks()[0]);
      setProcessedVideoTrack(track);
    }

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      segmenterRef.current?.close();
      camStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ---------- CAMERA FLIP (front/back) ----------
  // Swaps the source feeding the canvas. The published track is the canvas
  // capture, so it keeps working and background effects stay applied.
  const openCamera = async (mode) =>
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: mode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

  const switchCamera = useCallback(async () => {
    const videoEl = videoElRef.current;
    if (!videoEl || switchingRef.current) return;
    switchingRef.current = true;
    const previous = facingRef.current;
    const next = previous === "user" ? "environment" : "user";

    // Many Android phones can't open a second camera while the first is
    // still open, so release the old one first.
    camStreamRef.current?.getTracks().forEach((t) => t.stop());

    let used = next;
    let newStream;
    try {
      newStream = await openCamera(next);
    } catch (err) {
      console.error("Camera flip failed:", err);
      setDebugError(`Camera flip failed: ${err.message || err}`);
      try {
        newStream = await openCamera(previous); // restore what we had
        used = previous;
      } catch (err2) {
        setDebugError(`Camera error: ${err2.message || err2}`);
        switchingRef.current = false;
        return;
      }
    }

    try {
      camStreamRef.current = newStream;
      videoEl.srcObject = newStream;
      await videoEl.play();
      facingRef.current = used;
      setFacing(used);

      const s = newStream.getVideoTracks()[0].getSettings();
      const canvas = canvasRef.current;
      if (canvas && s.width && s.height && (canvas.width !== s.width || canvas.height !== s.height)) {
        canvas.width = s.width;
        canvas.height = s.height;
      }
      if (used === next) setDebugError(null);
    } catch (err) {
      setDebugError(`Camera error: ${err.message || err}`);
    } finally {
      switchingRef.current = false;
    }
  }, []);

  // ---------- AUDIO ----------
  const audioCtxRef = useRef(null);
  const musicElRef = useRef(null);
  const musicGainRef = useRef(null);
  const sfxGainRef = useRef(null);
  const musicBlobRef = useRef(null);
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

        // Once an element is passed to createMediaElementSource, its output
        // goes ONLY into the Web Audio graph (not the phone speaker), so the
        // old muted/volume=0 tricks aren't needed — and they can silence the
        // signal inside the graph on some browsers.
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
          const track = new LocalAudioTrack(destination.stream.getAudioTracks()[0]);
          setProcessedAudioTrack(track);
        }
      } catch (err) {
        console.error("Failed to initialize audio/music pipeline:", err);
        setDebugError(`Audio error: ${err.message || err}`);
      }
    }

    initAudio();
    return () => {
      cancelled = true;
      audioCtxRef.current?.close();
      if (musicElRef.current) {
        musicElRef.current.remove();
      }
    };
  }, []);

  // Browsers keep the AudioContext suspended until a tap. Resume it and
  // confirm it's really running before trying to play anything.
  const ensureAudioRunning = async () => {
    const ctx = audioCtxRef.current;
    if (!ctx) throw new Error("Audio isn't ready yet — wait a moment and try again.");
    if (ctx.state !== "running") await ctx.resume();
    if (ctx.state !== "running") {
      throw new Error("Browser blocked audio — tap the screen and try again.");
    }
  };

  // Fetch remote URLs as blobs (same-origin, avoids cross-origin audio being
  // silenced), then wait until the file is actually ready to play.
  const loadTrack = useCallback(async (urlOrFile) => {
    const el = musicElRef.current;
    if (!el) {
      setDebugError("Audio isn't ready yet — wait a moment and try again.");
      return;
    }
    try {
      let blob;
      if (typeof urlOrFile === "string") {
        const res = await fetch(urlOrFile);
        if (!res.ok) throw new Error(`Track download failed (${res.status})`);
        blob = await res.blob();
      } else {
        blob = urlOrFile;
      }

      if (musicBlobRef.current) URL.revokeObjectURL(musicBlobRef.current);
      const url = URL.createObjectURL(blob);
      musicBlobRef.current = url;

      el.pause();
      setIsPlaying(false);
      el.src = url;
      el.load();

      await new Promise((resolve, reject) => {
        const onReady = () => {
          el.removeEventListener("error", onError);
          resolve();
        };
        const onError = () => {
          el.removeEventListener("canplay", onReady);
          reject(new Error("Couldn't read that audio file."));
        };
        el.addEventListener("canplay", onReady, { once: true });
        el.addEventListener("error", onError, { once: true });
      });
      setDebugError(null);
    } catch (err) {
      console.error("Failed to load track:", err);
      setDebugError(`Track load failed: ${err.message || err}`);
    }
  }, []);

  const play = useCallback(async () => {
    const el = musicElRef.current;
    if (!el) return;
    if (!el.src) {
      setDebugError("Load a track first (Choose file, or paste a URL and tap Load URL).");
      return;
    }
    try {
      await ensureAudioRunning();
      await el.play();
      setIsPlaying(true);
      setDebugError(null);
    } catch (err) {
      console.error("Music play failed:", err);
      setIsPlaying(false);
      setDebugError(`Music play failed: ${err.message || err}`);
    }
  }, []);

  const pause = useCallback(() => {
    musicElRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    if (musicGainRef.current) musicGainRef.current.gain.value = v;
  }, []);

  const playSfx = useCallback(async (url) => {
    if (!audioCtxRef.current || !sfxGainRef.current) {
      setDebugError("Audio isn't ready yet — wait a moment and try again.");
      return;
    }
    try {
      await ensureAudioRunning();

      const res = await fetch(url);
      if (!res.ok) throw new Error(`SFX download failed (${res.status})`);
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

      el.onended = () => {
        source.disconnect();
        el.remove();
        URL.revokeObjectURL(blobUrl);
      };
      await el.play();
    } catch (err) {
      console.error("SFX failed:", err);
      setDebugError(`SFX error: ${err.message || err}`);
    }
  }, []);

  return {
    videoTrack: processedVideoTrack,
    audioTrack: processedAudioTrack,
    bgMode,
    setBgMode,
    setBackgroundImage,
    music: { loadTrack, play, pause, isPlaying, volume, setVolume },
    sfx: { play: playSfx },
    camera: { switchCamera, facing },
    debugError,
  };
}
