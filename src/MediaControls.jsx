import { useRef, useState, useEffect, useCallback } from "react";
import { LocalVideoTrack, LocalAudioTrack } from "livekit-client";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

export function useMediaControls({ backgroundImageUrl } = {}) {
  const videoElRef = useRef(null);
  const canvasRef = useRef(null);
  const segmenterRef = useRef(null);
  const rafRef = useRef(null);
  const bgImageRef = useRef(null);
  const bgModeRef = useRef("none");

  const [bgMode, setBgModeState] = useState("none");
  const [processedVideoTrack, setProcessedVideoTrack] = useState(null);

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
    };
    img.src = url;
  }, []);

  // ---------- BACKGROUND EFFECT ----------
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        const videoEl = document.createElement("video");
        videoEl.srcObject = camStream;
        videoEl.muted = true;
        await videoEl.play();
        videoElRef.current = videoEl;

        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d");

        if (backgroundImageUrl) {
          setBackgroundImage(backgroundImageUrl);
        }

        const segmenter = new SelfieSegmentation({
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
          }
          rafRef.current = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        const canvasStream = canvas.captureStream(30);
        const track = new LocalVideoTrack(canvasStream.getVideoTracks()[0]);
        setProcessedVideoTrack(track);
      } catch (err) {
        console.error("Failed to initialize video/background pipeline:", err);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      segmenterRef.current?.close();
    };
  }, []);

  // ---------- MUSIC MIXING ----------
  const audioCtxRef = useRef(null);
  const musicElRef = useRef(null);
  const musicGainRef = useRef(null);
  const [processedAudioTrack, setProcessedAudioTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);

  useEffect(() => {
    let cancelled = false;

    async function initAudio() {
      try {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micSource = audioCtx.createMediaStreamSource(micStream);

        const musicEl = document.createElement("audio");
        musicEl.crossOrigin = "anonymous";
        musicElRef.current = musicEl;
        const musicSource = audioCtx.createMediaElementSource(musicEl);
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = volume;
        musicGainRef.current = musicGain;
        musicSource.connect(musicGain);

        const destination = audioCtx.createMediaStreamDestination();
        micSource.connect(destination);
        musicGain.connect(destination);

        if (!cancelled) {
          const track = new LocalAudioTrack(destination.stream.getAudioTracks()[0]);
          setProcessedAudioTrack(track);
        }
      } catch (err) {
        console.error("Failed to initialize audio/music pipeline:", err);
      }
    }

    initAudio();
    return () => {
      cancelled = true;
      audioCtxRef.current?.close();
    };
  }, []);

  const loadTrack = useCallback((urlOrFile) => {
    if (!musicElRef.current) return;
    const url =
      typeof urlOrFile === "string" ? urlOrFile : URL.createObjectURL(urlOrFile);
    musicElRef.current.src = url;
  }, []);

  const play = useCallback(() => {
    musicElRef.current?.play().catch((err) => console.error("Music play failed:", err));
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

  return {
    videoTrack: processedVideoTrack,
    audioTrack: processedAudioTrack,
    bgMode,
    setBgMode,
    setBackgroundImage,
    music: { loadTrack, play, pause, isPlaying, volume, setVolume },
  };
}
    async function init() {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        const videoEl = document.createElement("video");
        videoEl.srcObject = camStream;
        videoEl.muted = true;
        await videoEl.play();
        videoElRef.current = videoEl;

        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d");

        if (backgroundImageUrl) {
          setBackgroundImage(backgroundImageUrl);
        }

        const segmenter = new SelfieSegmentation({
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
          }
          rafRef.current = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        const canvasStream = canvas.captureStream(30);
        const track = new LocalVideoTrack(canvasStream.getVideoTracks()[0]);
        setProcessedVideoTrack(track);
      } catch (err) {
        console.error("Failed to initialize video/background pipeline:", err);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      segmenterRef.current?.close();
    };
  }, []);

  // ---------- MUSIC MIXING ----------
  const audioCtxRef = useRef(null);
  const musicElRef = useRef(null);
  const musicGainRef = useRef(null);
  const [processedAudioTrack, setProcessedAudioTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);

  useEffect(() => {
    let cancelled = false;

    async function initAudio() {
      try {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micSource = audioCtx.createMediaStreamSource(micStream);

        const musicEl = document.createElement("audio");
        musicEl.crossOrigin = "anonymous";
        musicElRef.current = musicEl;
        const musicSource = audioCtx.createMediaElementSource(musicEl);
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = volume;
        musicGainRef.current = musicGain;
        musicSource.connect(musicGain);

        const destination = audioCtx.createMediaStreamDestination();
        micSource.connect(destination);
        musicGain.connect(destination);

        if (!cancelled) {
          const track = new LocalAudioTrack(destination.stream.getAudioTracks()[0]);
          setProcessedAudioTrack(track);
        }
      } catch (err) {
        console.error("Failed to initialize audio/music pipeline:", err);
      }
    }

    initAudio();
    return () => {
      cancelled = true;
      audioCtxRef.current?.close();
    };
  }, []);

  const loadTrack = useCallback((urlOrFile) => {
    if (!musicElRef.current) return;
    const url =
      typeof urlOrFile === "string" ? urlOrFile : URL.createObjectURL(urlOrFile);
    musicElRef.current.src = url;
  }, []);

  const play = useCallback(() => {
    musicElRef.current?.play().catch((err) => console.error("Music play failed:", err));
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

  return {
    videoTrack: processedVideoTrack,
    audioTrack: processedAudioTrack,
    bgMode,
    setBgMode,
    setBackgroundImage,
    music: { loadTrack, play, pause, isPlaying, volume, setVolume },
  };
}
    async function init() {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        const videoEl = document.createElement("video");
        videoEl.srcObject = camStream;
        videoEl.muted = true;
        await videoEl.play();
        videoElRef.current = videoEl;

        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d");

        if (backgroundImageUrl) {
          setBackgroundImage(backgroundImageUrl);
        }

        const segmenter = new SelfieSegmentation({
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
          }
          rafRef.current = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        const canvasStream = canvas.captureStream(30);
        const track = new LocalVideoTrack(canvasStream.getVideoTracks()[0]);
        setProcessedVideoTrack(track);
      } catch (err) {
        console.error("Failed to initialize video/background pipeline:", err);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      segmenterRef.current?.close();
    };
  }, []);

  // ---------- MUSIC MIXING ----------
  const audioCtxRef = useRef(null);
  const musicElRef = useRef(null);
  const musicGainRef = useRef(null);
  const [processedAudioTrack, setProcessedAudioTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);

  useEffect(() => {
    let cancelled = false;

    async function initAudio() {
      try {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micSource = audioCtx.createMediaStreamSource(micStream);

        const musicEl = document.createElement("audio");
        musicEl.crossOrigin = "anonymous";
        musicElRef.current = musicEl;
        const musicSource = audioCtx.createMediaElementSource(musicEl);
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = volume;
        musicGainRef.current = musicGain;
        musicSource.connect(musicGain);

        const destination = audioCtx.createMediaStreamDestination();
        micSource.connect(destination);
        musicGain.connect(destination);

        if (!cancelled) {
          const track = new LocalAudioTrack(destination.stream.getAudioTracks()[0]);
          setProcessedAudioTrack(track);
        }
      } catch (err) {
        console.error("Failed to initialize audio/music pipeline:", err);
      }
    }

    initAudio();
    return () => {
      cancelled = true;
      audioCtxRef.current?.close();
    };
  }, []);

  const loadTrack = useCallback((urlOrFile) => {
    if (!musicElRef.current) return;
    const url =
      typeof urlOrFile === "string" ? urlOrFile : URL.createObjectURL(urlOrFile);
    musicElRef.current.src = url;
  }, []);

  const play = useCallback(() => {
    musicElRef.current?.play().catch((err) => console.error("Music play failed:", err));
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

  return {
    videoTrack: processedVideoTrack,
    audioTrack: processedAudioTrack,
    bgMode,
    setBgMode,
    setBackgroundImage,
    music: { loadTrack, play, pause, isPlaying, volume, setVolume },
  };
}
  // Swap the background image at any time without restarting the camera/segmenter
  const setBackgroundImage = useCallback((urlOrFile) => {
    const url =
      typeof urlOrFile === "string" ? urlOrFile : URL.createObjectURL(urlOrFile);
    const img = new Image();
    img.onload = () => {
      bgImageRef.current = img;
    };
    img.src = url;
  }, []);

  // ---------- BACKGROUND EFFECT ----------
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      const videoEl = document.createElement("video");
      videoEl.srcObject = camStream;
      videoEl.muted = true;
      await videoEl.play();
      videoElRef.current = videoEl;

      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d");

      if (backgroundImageUrl) {
        setBackgroundImage(backgroundImageUrl);
      }

      const segmenter = new SelfieSegmentation({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });
      segmenter.setOptions({ modelSelection: 1 });

      segmenter.onResults((results) => {
        if (cancelled) return;
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the segmentation mask, then composite background + person
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
          // 'none', or 'image' with nothing loaded yet — show the raw feed
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
      });

      segmenterRef.current = segmenter;

      const renderLoop = async () => {
        if (cancelled) return;
        await segmenter.send({ image: videoEl });
        rafRef.current = requestAnimationFrame(renderLoop);
      };
      renderLoop();

      // Canvas -> MediaStreamTrack -> LiveKit LocalVideoTrack
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
  }, []); // runs once; bgMode/bgImage now update live via refs, not restarts

  // ---------- MUSIC MIXING ----------
  const audioCtxRef = useRef(null);
  const musicElRef = useRef(null);
  const musicGainRef = useRef(null);
  const [processedAudioTrack, setProcessedAudioTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);

  useEffect(() => {
    let cancelled = false;

    async function initAudio() {
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const micSource = audioCtx.createMediaStreamSource(micStream);

      const musicEl = document.createElement("audio");
      musicEl.crossOrigin = "anonymous";
      musicElRef.current = musicEl;
      const musicSource = audioCtx.createMediaElementSource(musicEl);
      const musicGain = audioCtx.createGain();
      musicGain.gain.value = volume;
      musicGainRef.current = musicGain;
      musicSource.connect(musicGain);

      const destination = audioCtx.createMediaStreamDestination();
      micSource.connect(destination);
      musicGain.connect(destination);

      if (!cancelled) {
        const track = new LocalAudioTrack(destination.stream.getAudioTracks()[0]);
        setProcessedAudioTrack(track);
      }
    }

    initAudio();
    return () => {
      cancelled = true;
      audioCtxRef.current?.close();
    };
  }, []);

  const loadTrack = useCallback((urlOrFile) => {
    if (!musicElRef.current) return;
    const url =
      typeof urlOrFile === "string" ? urlOrFile : URL.createObjectURL(urlOrFile);
    musicElRef.current.src = url;
  }, []);

  const play = useCallback(() => {
    musicElRef.current?.play();
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

  return {
    videoTrack: processedVideoTrack,
    audioTrack: processedAudioTrack,
    bgMode,
    setBgMode,
    setBackgroundImage,
    music: { loadTrack, play, pause, isPlaying, volume, setVolume },
  };
}
