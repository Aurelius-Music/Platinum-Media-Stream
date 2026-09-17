import { useRef, useEffect, useState } from 'react';

export function useBackgroundEffect(videoTrack, mode, bgImage) {
  const canvasRef = useRef(document.createElement('canvas'));
  const segmenterRef = useRef(null);
  const rafRef = useRef(null);
  const [outputStream, setOutputStream] = useState(null);

  useEffect(() => {
    if (!videoTrack || mode === 'none') {
      setOutputStream(null);
      return;
    }
    if (!window.SelfieSegmentation) {
      console.error('SelfieSegmentation script not loaded yet');
      return;
    }

    const videoEl = document.createElement('video');
    videoEl.srcObject = new MediaStream([videoTrack.mediaStreamTrack]);
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.play();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const segmenter = new window.SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });
    segmenter.setOptions({ modelSelection: 1 });

    segmenter.onResults((results) => {
      canvas.width = results.image.width;
      canvas.height = results.image.height;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = 'destination-over';
      if (mode === 'blur') {
        ctx.filter = 'blur(12px)';
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
      } else if (mode === 'image' && bgImage) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    });

    segmenterRef.current = segmenter;

    const loop = async () => {
      if (videoEl.readyState >= 2) {
        await segmenter.send({ image: videoEl });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    setOutputStream(canvas.captureStream(30));

    return () => {
      cancelAnimationFrame(rafRef.current);
      segmenter.close();
      videoEl.pause();
      videoEl.srcObject = null;
    };
  }, [videoTrack, mode, bgImage]);

  return outputStream;
}
