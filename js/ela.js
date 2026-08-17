/* ═══════════════════════════════════════════════
   📐 DIP: ERROR LEVEL ANALYSIS (ELA)
   Highlights differences between original and recompressed image to identify manipulated regions
   ═══════════════════════════════════════════════ */

window.performELA = function(sourceCanvas, resultCanvas, options) {
    return new Promise((resolve, reject) => {
        const defaultOptions = { quality: 75, scale: 15, heatmap: false };
        const opt = { ...defaultOptions, ...options };
        
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        resultCanvas.width = width;
        resultCanvas.height = height;

        const sourceCtx = sourceCanvas.getContext('2d');
        const resultCtx = resultCanvas.getContext('2d');
        const originalImageData = sourceCtx.getImageData(0, 0, width, height);

        /* ═══════════════════════════════════════════════
           📐 DIP: JPEG COMPRESSION / DCT
           Export as JPEG to exploit DCT-based lossy compression.
           ═══════════════════════════════════════════════ */
        // Export to JPEG at specific quality setting to force DCT quantization error
        const jpegDataUrl = sourceCanvas.toDataURL('image/jpeg', opt.quality / 100);

        const img = new Image();
        img.onload = () => {
            /* ═══════════════════════════════════════════════
               📐 DIP: IMAGE RESAMPLING
               Load the re-compressed JPEG back into a temp canvas
               ═══════════════════════════════════════════════ */
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0);
            const recompressedImageData = tempCtx.getImageData(0, 0, width, height);

            const resultImageData = resultCtx.createImageData(width, height);
            
            for (let i = 0; i < originalImageData.data.length; i += 4) {
                /* ═══════════════════════════════════════════════
                   📐 DIP: PIXEL-WISE DIFFERENCE / ERROR QUANTIZATION
                   Compute absolute difference per channel
                   ═══════════════════════════════════════════════ */
                let diffR = Math.abs(originalImageData.data[i] - recompressedImageData.data[i]);
                let diffG = Math.abs(originalImageData.data[i + 1] - recompressedImageData.data[i + 1]);
                let diffB = Math.abs(originalImageData.data[i + 2] - recompressedImageData.data[i + 2]);

                /* ═══════════════════════════════════════════════
                   📐 DIP: CONTRAST STRETCHING / AMPLIFICATION
                   Multiply difference by scale factor and clamp to [0, 255]
                   ═══════════════════════════════════════════════ */
                diffR = Math.min(255, Math.floor(diffR * opt.scale));
                diffG = Math.min(255, Math.floor(diffG * opt.scale));
                diffB = Math.min(255, Math.floor(diffB * opt.scale));

                if (opt.heatmap) {
                    /* ═══════════════════════════════════════════════
                       📐 DIP: PSEUDOCOLOR MAPPING / HEATMAP
                       Convert grayscale intensity to a heatmap color
                       ═══════════════════════════════════════════════ */
                    const intensity = (diffR + diffG + diffB) / 3;
                    const normalized = intensity / 255;
                    
                    // Simple heatmap: blue -> cyan -> green -> yellow -> red
                    let r = 0, g = 0, b = 0;
                    if (normalized < 0.25) {
                        r = 0; g = Math.floor(normalized * 4 * 255); b = 255;
                    } else if (normalized < 0.5) {
                        r = 0; g = 255; b = Math.floor((1 - (normalized - 0.25) * 4) * 255);
                    } else if (normalized < 0.75) {
                        r = Math.floor((normalized - 0.5) * 4 * 255); g = 255; b = 0;
                    } else {
                        r = 255; g = Math.floor((1 - (normalized - 0.75) * 4) * 255); b = 0;
                    }
                    
                    resultImageData.data[i] = r;
                    resultImageData.data[i + 1] = g;
                    resultImageData.data[i + 2] = b;
                } else {
                    resultImageData.data[i] = diffR;
                    resultImageData.data[i + 1] = diffG;
                    resultImageData.data[i + 2] = diffB;
                }
                resultImageData.data[i + 3] = 255; // Alpha channel
            }

            resultCtx.putImageData(resultImageData, 0, 0);
            resolve();
        };
        img.onerror = reject;
        img.src = jpegDataUrl;
    });
};
