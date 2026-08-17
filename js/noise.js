/* ═══════════════════════════════════════════════
   📐 DIP: NOISE ANALYSIS
   Extracts noise residual by subtracting blurred image from original
   ═══════════════════════════════════════════════ */

window.performNoiseAnalysis = function(sourceCanvas, resultCanvas, options) {
    const defaultOptions = { radius: 3, amplification: 10, invert: false };
    const opt = { ...defaultOptions, ...options };
    
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    
    resultCanvas.width = width;
    resultCanvas.height = height;

    const sourceCtx = sourceCanvas.getContext('2d');
    const resultCtx = resultCanvas.getContext('2d');
    const originalData = sourceCtx.getImageData(0, 0, width, height);
    const data = originalData.data;

    /* ═══════════════════════════════════════════════
       📐 DIP: GAUSSIAN KERNEL GENERATION
       Create a 1D Gaussian kernel of given radius with sigma = radius/2
       ═══════════════════════════════════════════════ */
    const radius = opt.radius;
    const sigma = Math.max(0.1, radius / 2);
    const kernelSize = radius * 2 + 1;
    const kernel = new Float32Array(kernelSize);
    let sum = 0;
    
    for (let i = 0; i < kernelSize; i++) {
        const x = i - radius;
        // Gaussian distribution formula
        kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        sum += kernel[i];
    }
    // Normalize kernel
    for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= sum;
    }

    /* ═══════════════════════════════════════════════
       📐 DIP: SEPARABLE CONVOLUTION / LOW-PASS FILTERING
       Apply kernel horizontally then vertically
       ═══════════════════════════════════════════════ */
    const tempBuffer = new Float32Array(width * height * 3);
    const blurredBuffer = new Float32Array(width * height * 3);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;
            for (let k = -radius; k <= radius; k++) {
                let px = x + k;
                // Clamp to edge
                if (px < 0) px = 0;
                if (px >= width) px = width - 1;
                
                const weight = kernel[k + radius];
                const idx = (y * width + px) * 4;
                r += data[idx] * weight;
                g += data[idx + 1] * weight;
                b += data[idx + 2] * weight;
            }
            const outIdx = (y * width + x) * 3;
            tempBuffer[outIdx] = r;
            tempBuffer[outIdx + 1] = g;
            tempBuffer[outIdx + 2] = b;
        }
    }

    // Vertical pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;
            for (let k = -radius; k <= radius; k++) {
                let py = y + k;
                // Clamp to edge
                if (py < 0) py = 0;
                if (py >= height) py = height - 1;
                
                const weight = kernel[k + radius];
                const idx = (py * width + x) * 3;
                r += tempBuffer[idx] * weight;
                g += tempBuffer[idx + 1] * weight;
                b += tempBuffer[idx + 2] * weight;
            }
            const outIdx = (y * width + x) * 3;
            blurredBuffer[outIdx] = r;
            blurredBuffer[outIdx + 1] = g;
            blurredBuffer[outIdx + 2] = b;
        }
    }

    const resultData = resultCtx.createImageData(width, height);
    const outData = resultData.data;

    for (let i = 0, len = data.length; i < len; i += 4) {
        const bufIdx = (i / 4) * 3;
        
        /* ═══════════════════════════════════════════════
           📐 DIP: HIGH-PASS FILTERING / NOISE RESIDUAL EXTRACTION
           noise = (original - blurred) * amplification + 128
           ═══════════════════════════════════════════════ */
        let nr = (data[i] - blurredBuffer[bufIdx]) * opt.amplification + 128;
        let ng = (data[i + 1] - blurredBuffer[bufIdx + 1]) * opt.amplification + 128;
        let nb = (data[i + 2] - blurredBuffer[bufIdx + 2]) * opt.amplification + 128;

        /* ═══════════════════════════════════════════════
           📐 DIP: INTENSITY CLAMPING
           Clamp all values to [0, 255]
           ═══════════════════════════════════════════════ */
        nr = Math.min(255, Math.max(0, Math.round(nr)));
        ng = Math.min(255, Math.max(0, Math.round(ng)));
        nb = Math.min(255, Math.max(0, Math.round(nb)));

        /* ═══════════════════════════════════════════════
           📐 DIP: IMAGE INVERSION
           If invert, invert all pixel values: 255 - value
           ═══════════════════════════════════════════════ */
        if (opt.invert) {
            nr = 255 - nr;
            ng = 255 - ng;
            nb = 255 - nb;
        }

        outData[i] = nr;
        outData[i + 1] = ng;
        outData[i + 2] = nb;
        outData[i + 3] = 255;
    }

    resultCtx.putImageData(resultData, 0, 0);
};
