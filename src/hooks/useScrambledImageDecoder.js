import { useState, useEffect, useCallback } from 'react';
import { decryptMappingAesCbc } from '../utils/cryptoUtils';

/**
 * Custom React Hook for decrypting mapping data and drawing a scrambled comic page onto a canvas element.
 * 
 * @param {Object} params
 * @param {string} params.scrambledImageUrl Cloudinary scrambled image URL
 * @param {number} [params.cols=4] Grid columns
 * @param {number} [params.rows=4] Grid rows
 * @param {string} params.encryptedMapping Base64 AES-128-CBC encrypted mapping string
 * @param {string} [params.secretKey] Optional secret key for AES decryption
 * @param {boolean} [params.enabled=true] Whether to trigger lazy rendering
 */
export function useScrambledImageDecoder({
  scrambledImageUrl,
  cols = 4,
  rows = 4,
  encryptedMapping,
  secretKey,
  enabled = true
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrambledOrder, setScrambledOrder] = useState(null);
  const [isRendered, setIsRendered] = useState(false);

  // Reassemble slices onto canvas
  const drawToCanvas = useCallback(
    async (canvasElement) => {
      if (!canvasElement || !scrambledImageUrl || !encryptedMapping || !enabled) {
        return;
      }

      setLoading(true);
      setError(null);
      setIsRendered(false);

      try {
        // 1. Decrypt mapping array
        const order = await decryptMappingAesCbc(encryptedMapping, secretKey);
        setScrambledOrder(order);

        if (!order || order.length === 0) {
          throw new Error('Decrypted scrambled order is empty');
        }

        // 2. Load scrambled image from CDN Cloudinary with crossOrigin = "anonymous"
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = scrambledImageUrl;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error(`Failed to load scrambled image from: ${scrambledImageUrl}`));
        });

        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        if (!naturalWidth || !naturalHeight) {
          throw new Error('Invalid image dimensions');
        }

        // 3. Configure backing store resolution on canvas
        const ctx = canvasElement.getContext('2d', { alpha: false });
        if (!ctx) {
          throw new Error('Failed to get 2d context from canvas');
        }

        canvasElement.width = naturalWidth;
        canvasElement.height = naturalHeight;

        // 4. Calculate sub-pixel slice dimensions
        const tileW = naturalWidth / cols;
        const tileH = naturalHeight / rows;
        const totalSlices = Math.min(order.length, cols * rows);

        // 5. Draw slices back to original positions
        ctx.clearRect(0, 0, naturalWidth, naturalHeight);

        for (let i = 0; i < totalSlices; i++) {
          const origIdx = order[i];

          // Source slice coordinates in scrambled image (slot i)
          const sc = i % cols;
          const sr = Math.floor(i / cols);
          const sx = Math.round(sc * tileW);
          const sy = Math.round(sr * tileH);
          const sw = Math.round((sc + 1) * tileW) - sx;
          const sh = Math.round((sr + 1) * tileH) - sy;

          // Target slice coordinates in original canvas (original index origIdx)
          const dc = origIdx % cols;
          const dr = Math.floor(origIdx / cols);
          const dx = Math.round(dc * tileW);
          const dy = Math.round(dr * tileH);
          const dw = Math.round((dc + 1) * tileW) - dx;
          const dh = Math.round((dr + 1) * tileH) - dy;

          ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
        }

        setLoading(false);
        setIsRendered(true);
      } catch (err) {
        console.error('Error in useScrambledImageDecoder:', err);
        setError(err.message || 'Error reassembling comic page');
        setLoading(false);
      }
    },
    [scrambledImageUrl, cols, rows, encryptedMapping, secretKey, enabled]
  );

  return {
    loading,
    error,
    scrambledOrder,
    isRendered,
    drawToCanvas
  };
}

export default useScrambledImageDecoder;
