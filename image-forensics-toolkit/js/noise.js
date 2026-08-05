/**
 * Noise Analysis
 * 
 * Digital cameras have specific noise patterns. When an image is spliced 
 * from different sources or edited, the noise pattern often becomes inconsistent.
 * 
 * This module extracts the noise pattern by subtracting a blurred version 
 * of the image from the original. A Gaussian blur is used as a low-pass filter, 
 * so subtracting it leaves the high-frequency components (noise).
 */
window.performNoiseAnalysis = function(sourceCanvas, resultCanvas, options) {
    const defaultOptions = { radius: 3, amplification: 10, invert: false };
    const config = Object.assign({}, defaultOptions, options);

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    resultCanvas.width = width;
    resultCanvas.height = height;

    const sourceCtx = sourceCanvas.getContext('2d');
    const resultCtx = resultCanvas.getContext('2d');
    
    const originalImageData = sourceCtx.getImageData(0, 0, width, height);
    const origData = originalImageData.data;
    
    // Create arrays for blurring
    const floatData = new Float32Array(width * height * 4);
    for (let i = 0; i < origData.length; i++) {
        floatData[i] = origData[i];
    }
    
    const blurredData = new Float32Array(width * height * 4);

    // 1. Create 1D Gaussian kernel
    // Ensure radius is odd
    const radius = config.radius % 2 === 0 ? config.radius + 1 : config.radius;
    const halfRadius = Math.floor(radius / 2);
    const sigma = Math.max(radius / 2, 1);
    const kernel = new Float32Array(radius);
    let kernelSum = 0;
    
    for (let i = 0; i < radius; i++) {
        const x = i - halfRadius;
        // Gaussian function
        const val = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernel[i] = val;
        kernelSum += val;
    }
    // Normalize kernel
    for (let i = 0; i < radius; i++) {
        kernel[i] /= kernelSum;
    }

    // 2. Apply separable Gaussian blur
    const tempBuffer = new Float32Array(width * height * 4);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let k = -halfRadius; k <= halfRadius; k++) {
                let px = Math.min(Math.max(x + k, 0), width - 1);
                const offset = (y * width + px) * 4;
                const weight = kernel[k + halfRadius];
                r += floatData[offset] * weight;
                g += floatData[offset + 1] * weight;
                b += floatData[offset + 2] * weight;
                a += floatData[offset + 3] * weight;
            }
            const outOffset = (y * width + x) * 4;
            tempBuffer[outOffset] = r;
            tempBuffer[outOffset + 1] = g;
            tempBuffer[outOffset + 2] = b;
            tempBuffer[outOffset + 3] = a;
        }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let k = -halfRadius; k <= halfRadius; k++) {
                let py = Math.min(Math.max(y + k, 0), height - 1);
                const offset = (py * width + x) * 4;
                const weight = kernel[k + halfRadius];
                r += tempBuffer[offset] * weight;
                g += tempBuffer[offset + 1] * weight;
                b += tempBuffer[offset + 2] * weight;
                a += tempBuffer[offset + 3] * weight;
            }
            const outOffset = (y * width + x) * 4;
            blurredData[outOffset] = r;
            blurredData[outOffset + 1] = g;
            blurredData[outOffset + 2] = b;
            blurredData[outOffset + 3] = a;
        }
    }

    // 3. Compute noise residual
    const resultImageData = resultCtx.createImageData(width, height);
    const resData = resultImageData.data;

    for (let i = 0; i < origData.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            // noise = (original - blurred) * amplification + 128
            let diff = origData[i + c] - blurredData[i + c];
            let val = diff * config.amplification + 128;
            
            // Clamp
            val = Math.max(0, Math.min(255, val));
            
            // Invert if needed
            if (config.invert) {
                val = 255 - val;
            }
            
            resData[i + c] = val;
        }
        resData[i + 3] = 255; // Alpha fully opaque
    }

    // 4. Draw result
    resultCtx.putImageData(resultImageData, 0, 0);
};
