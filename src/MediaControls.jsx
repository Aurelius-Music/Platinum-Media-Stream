import { useRef, useState, useEffect, useCallback } from "react";
import { LocalVideoTrack, LocalAudioTrack } from "livekit-client";
// Note: no npm import for SelfieSegmentation — it's loaded via <script> in
// index.html and used as window.SelfieSegmentation. This avoids the Vite
// minification bug that broke the named npm import in production builds.

export function useMediaControls({ backgroundImageUrl } = {}) {
  const videoElRef = useRef(null);
  const canvasRef = useRef(null);
  const segmenterRef = useRef(null);
  const rafRef = useRef(null);
  const bgImageRef = useRef(null);
  const bgModeRef = useRef("none");

  const [bgMode, setBgModeState] = useState("none");
  const [processedVideoTrack, setProcessedVideoTrack] = useState(null);
  const [debugError, setDebugError] = useState(null);

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
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 16 / 9 },
          },
        });
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
    };
  }, []);

  const audioCtxRef = useRef(null);
  const musicElRef = useRef(null);
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
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const micSource = audioCtx.createMediaStreamSource(micStream);

        const musicEl = document.createElement("audio");
        musicEl.crossOrigin = "anonymous";
        musicEl.style.display = "none";
        musicEl.setAttribute("playsinline", "");
        document.body.appendChild(musicEl);
        musicEl.muted = true;
        musicElRef.current = musicEl;

        const musicSource = audioCtx.createMediaElementSource(musicEl);
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = volume;
        musicGainRef.current = musicGain;
        musicSource.connect(musicGain);

        // ---------- SOUND EFFECTS BUS ----------
        const sfxGain = audioCtx.createGain();
        sfxGain.gain.value = 0.9;
        sfxGainRef.current = sfxGain;

        // ---------- LIMITER — caps the combined mix so it can't clip/distort ----------
        const limiter = audioCtx.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.25;

        const destination = audioCtx.createMediaStreamDestination();

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

  const loadTrack = useCallback((urlOrFile) => {
    if (!musicElRef.current) return;
    const url =
      typeof urlOrFile === "string" ? urlOrFile : URL.createObjectURL(urlOrFile);
    musicElRef.current.src = url;
  }, []);

  const play = useCallback(() => {
    audioCtxRef.current?.resume();
    musicElRef.current
      ?.play()
      .catch((err) => console.error("Music play failed:", err));
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    musicElRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    if (musicGainRef.current) musicGainRef.current.gain.value = v;
  }, []);

  const playSfx = useCallback((url) => {
    if (!audioCtxRef.current || !sfxGainRef.current) return;
    const el = document.createElement("audio");
    el.crossOrigin = "anonymous";
    el.src = url;
    el.muted = true;
    el.setAttribute("playsinline", "");
    document.body.appendChild(el);

    audioCtxRef.current.resume();
    const source = audioCtxRef.current.createMediaElementSource(el);
    source.connect(sfxGainRef.current);

    el.play().catch((err) => console.error("SFX play failed:", err));
    el.onended = () => {
      source.disconnect();
      el.remove();
    };
  }, []);

  return {
    videoTrack: processedVideoTrack,
    audioTrack: processedAudioTrack,
    bgMode,
    setBgMode,
    setBackgroundImage,
    music: { loadTrack, play, pause, isPlaying, volume, setVolume },
    sfx: { play: playSfx },
    debugError,
  };
}
