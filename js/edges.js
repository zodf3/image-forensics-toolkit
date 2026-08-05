/**
 * Edge & Gradient Detection Module
 * 
 * Applies various edge detection operators to reveal boundaries and gradients.
 * Useful for detecting tampering boundaries where edited content meets the original.
 */

// Helper: 2D Convolution on a single channel (grayscale) image
// Applies a given kernel and returns a new Float32Array of the same dimensions.
function convolve2D(grayData, width, height, kernel) {
    const kRows = kernel.length;
    const kCols = kernel[0].length;
    const halfRow = Math.floor(kRows / 2);
    const halfCol = Math.floor(kCols / 2);
    
    const output = new Float32Array(width * height);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            
            for (let ky = 0; ky < kRows; ky++) {
                for (let kx = 0; kx < kCols; kx++) {
                    const iy = y + ky - halfRow;
                    const ix = x + kx - halfCol;
                    
                    // Boundary handling: clamp to edge (replicate pixels)
                    const cy = Math.max(0, Math.min(height - 1, iy));
                    const cx = Math.max(0, Math.min(width - 1, ix));
                    
                    sum += grayData[cy * width + cx] * kernel[ky][kx];
                }
            }
            output[y * width + x] = sum;
        }
    }
    return output;
}

window.performEdgeDetection = function(sourceCanvas, resultCanvas, options) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    
    // Ensure result canvas dimensions match source
    resultCanvas.width = width;
    resultCanvas.height = height;

    const ctxSource = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const ctxResult = resultCanvas.getContext('2d');

    const sourceData = ctxSource.getImageData(0, 0, width, height);
    const resultData = ctxResult.createImageData(width, height);

    const method = options.method || 'sobel';
    const threshold = options.threshold !== undefined ? options.threshold : 30;
    const overlay = options.overlay === true;

    // 1. Convert source to grayscale (luminance)
    const grayData = new Float32Array(width * height);
    for (let i = 0, j = 0; i < sourceData.data.length; i += 4, j++) {
        const r = sourceData.data[i];
        const g = sourceData.data[i + 1];
        const b = sourceData.data[i + 2];
        grayData[j] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const magnitude = new Float32Array(width * height);
    
    // Define Convolution Kernels
    let Gx, Gy;
    switch (method) {
        case 'sobel':
            Gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
            Gy = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
            break;
        case 'prewitt':
            Gx = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
            Gy = [[-1, -1, -1], [0, 0, 0], [1, 1, 1]];
            break;
        case 'scharr':
            Gx = [[-3, 0, 3], [-10, 0, 10], [-3, 0, 3]];
            Gy = [[-3, -10, -3], [0, 0, 0], [3, 10, 3]];
            break;
        case 'roberts':
            // 2x2 Roberts cross operator
            Gx = [[1, 0], [0, -1]];
            Gy = [[0, 1], [-1, 0]];
            break;
        case 'laplacian':
            // Laplacian single kernel
            Gx = [[0, 1, 0], [1, -4, 1], [0, 1, 0]];
            Gy = null;
            break;
    }

    // 2-4. Apply Convolution and Compute Magnitude
    if (Gy) {
        const gradX = convolve2D(grayData, width, height, Gx);
        const gradY = convolve2D(grayData, width, height, Gy);
        for (let i = 0; i < magnitude.length; i++) {
            magnitude[i] = Math.sqrt(gradX[i] * gradX[i] + gradY[i] * gradY[i]);
        }
    } else {
        const grad = convolve2D(grayData, width, height, Gx);
        for (let i = 0; i < magnitude.length; i++) {
            magnitude[i] = Math.abs(grad[i]);
        }
    }

    // 5-6. Apply Threshold and Normalize
    let maxMag = 0;
    for (let i = 0; i < magnitude.length; i++) {
        if (magnitude[i] < threshold) {
            magnitude[i] = 0;
        } else if (magnitude[i] > maxMag) {
            maxMag = magnitude[i];
        }
    }

    for (let i = 0, j = 0; i < sourceData.data.length; i += 4, j++) {
        // Normalize edge intensity to 0-255 range based on max magnitude found
        const edgeVal = maxMag > 0 ? (magnitude[j] / maxMag) * 255 : 0;
        
        // 7. Render mode: overlay cyan on original OR show raw grayscale edges
        if (overlay) {
            const r = sourceData.data[i];
            const g = sourceData.data[i + 1];
            const b = sourceData.data[i + 2];
            
            if (edgeVal > 0) {
                // Blend cyan edges onto the image
                const alpha = edgeVal / 255;
                resultData.data[i] = r * (1 - alpha); // R=0
                resultData.data[i + 1] = Math.min(255, g * (1 - alpha) + edgeVal); // G=edgeVal
                resultData.data[i + 2] = Math.min(255, b * (1 - alpha) + edgeVal); // B=edgeVal
            } else {
                resultData.data[i] = r;
                resultData.data[i + 1] = g;
                resultData.data[i + 2] = b;
            }
        } else {
            resultData.data[i] = edgeVal;
            resultData.data[i + 1] = edgeVal;
            resultData.data[i + 2] = edgeVal;
        }
        
        resultData.data[i + 3] = sourceData.data[i + 3]; // Preserve original alpha
    }

    // 8. Draw to resultCanvas
    ctxResult.putImageData(resultData, 0, 0);
};
