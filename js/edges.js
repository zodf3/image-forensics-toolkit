/* ═══════════════════════════════════════════════
   📐 DIP: EDGE & GRADIENT DETECTION
   Detects edges using various operators via convolution
   ═══════════════════════════════════════════════ */

window.performEdgeDetection = function(sourceCanvas, resultCanvas, options) {
    const opts = Object.assign({ method: 'sobel', threshold: 30, overlay: false }, options);
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const ctx = sourceCanvas.getContext('2d', {willReadFrequently: true});
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    resultCanvas.width = width;
    resultCanvas.height = height;
    const resCtx = resultCanvas.getContext('2d');
    const resImgData = resCtx.createImageData(width, height);
    const resData = resImgData.data;

    /* ═══════════════════════════════════════════════
       📐 DIP: GRAYSCALE CONVERSION
       Convert to grayscale before convolution
       ═══════════════════════════════════════════════ */
    const grayData = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        grayData[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    /* ═══════════════════════════════════════════════
       📐 DIP: 2D CONVOLUTION
       Create a reusable convolve2D helper function
       ═══════════════════════════════════════════════ */
    function convolve2D(input, w, h, kernel) {
        const output = new Float32Array(w * h);
        const kRows = kernel.length;
        const kCols = kernel[0].length;
        const padY = Math.floor(kRows / 2);
        const padX = Math.floor(kCols / 2);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let sum = 0;
                for (let ky = 0; ky < kRows; ky++) {
                    for (let kx = 0; kx < kCols; kx++) {
                        const py = y + ky - padY;
                        const px = x + kx - padX;
                        // Zero padding for boundaries
                        if (py >= 0 && py < h && px >= 0 && px < w) {
                            sum += input[py * w + px] * kernel[ky][kx];
                        }
                    }
                }
                output[y * w + x] = sum;
            }
        }
        return output;
    }

    let Gx_kernel, Gy_kernel, kernel;

    switch (opts.method) {
        case 'prewitt':
            /* ═══════════════════════════════════════════════
               📐 DIP: PREWITT OPERATOR
               ═══════════════════════════════════════════════ */
            Gx_kernel = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
            Gy_kernel = [[-1, -1, -1], [0, 0, 0], [1, 1, 1]];
            break;
        case 'scharr':
            /* ═══════════════════════════════════════════════
               📐 DIP: SCHARR OPERATOR
               ═══════════════════════════════════════════════ */
            Gx_kernel = [[-3, 0, 3], [-10, 0, 10], [-3, 0, 3]];
            Gy_kernel = [[-3, -10, -3], [0, 0, 0], [3, 10, 3]];
            break;
        case 'roberts':
            /* ═══════════════════════════════════════════════
               📐 DIP: ROBERTS CROSS OPERATOR
               ═══════════════════════════════════════════════ */
            Gx_kernel = [[1, 0], [0, -1]];
            Gy_kernel = [[0, 1], [-1, 0]];
            break;
        case 'laplacian':
            /* ═══════════════════════════════════════════════
               📐 DIP: LAPLACIAN OPERATOR
               ═══════════════════════════════════════════════ */
            kernel = [[0, 1, 0], [1, -4, 1], [0, 1, 0]];
            break;
        case 'sobel':
        default:
            /* ═══════════════════════════════════════════════
               📐 DIP: SOBEL OPERATOR
               ═══════════════════════════════════════════════ */
            Gx_kernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
            Gy_kernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
            break;
    }

    const mag = new Float32Array(width * height);
    let maxMag = 0;

    if (kernel) {
        // Evaluate single kernel (e.g. Laplacian)
        const res = convolve2D(grayData, width, height, kernel);
        
        /* ═══════════════════════════════════════════════
           📐 DIP: GRADIENT MAGNITUDE
           For Laplacian: abs(result)
           ═══════════════════════════════════════════════ */
        for (let i = 0; i < mag.length; i++) {
            mag[i] = Math.abs(res[i]);
            if (mag[i] > maxMag) maxMag = mag[i];
        }
    } else {
        // Evaluate dual kernels (Gx, Gy)
        const Gx = convolve2D(grayData, width, height, Gx_kernel);
        const Gy = convolve2D(grayData, width, height, Gy_kernel);
        
        /* ═══════════════════════════════════════════════
           📐 DIP: GRADIENT MAGNITUDE
           For dual-kernel operators: sqrt(Gx² + Gy²)
           ═══════════════════════════════════════════════ */
        for (let i = 0; i < mag.length; i++) {
            mag[i] = Math.sqrt(Gx[i] * Gx[i] + Gy[i] * Gy[i]);
            if (mag[i] > maxMag) maxMag = mag[i];
        }
    }

    /* ═══════════════════════════════════════════════
       📐 DIP: NORMALIZATION & THRESHOLDING
       Normalize to 0-255 and suppress edges below threshold
       ═══════════════════════════════════════════════ */
    const threshold = opts.threshold;
    for (let i = 0; i < mag.length; i++) {
        // DIP: NORMALIZATION
        let val = (mag[i] / (maxMag || 1)) * 255;
        
        // DIP: THRESHOLDING
        if (val < threshold) {
            val = 0;
        }

        const pIdx = i * 4;
        
        /* ═══════════════════════════════════════════════
           📐 DIP: EDGE OVERLAY
           If overlay, blend edges (cyan color) onto original image
           ═══════════════════════════════════════════════ */
        if (opts.overlay) {
            if (val > 0) {
                // Cyan edge
                resData[pIdx] = 0;
                resData[pIdx + 1] = 255;
                resData[pIdx + 2] = 255;
                resData[pIdx + 3] = 255;
            } else {
                // Original pixel
                resData[pIdx] = data[pIdx];
                resData[pIdx + 1] = data[pIdx + 1];
                resData[pIdx + 2] = data[pIdx + 2];
                resData[pIdx + 3] = 255;
            }
        } else {
            // Grayscale edge magnitude
            resData[pIdx] = val;
            resData[pIdx + 1] = val;
            resData[pIdx + 2] = val;
            resData[pIdx + 3] = 255;
        }
    }

    resCtx.putImageData(resImgData, 0, 0);
};
