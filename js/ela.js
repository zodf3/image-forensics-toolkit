/**
 * Error Level Analysis (ELA)
 * 
 * ELA identifies areas within an image that are at different compression levels.
 * With JPEG images, the entire picture should be at roughly the same level. If 
 * a section of the image is at a significantly different error level, then it 
 * likely indicates a digital modification.
 * 
 * The algorithm works by re-saving the image at a known quality (e.g. 75%),
 * and computing the absolute difference between the original and re-saved image.
 */
window.performELA = function(sourceCanvas, resultCanvas, options) {
    const defaultOptions = { quality: 75, scale: 15, heatmap: false };
    const config = Object.assign({}, defaultOptions, options);

    return new Promise((resolve, reject) => {
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;

        // Ensure resultCanvas has correct dimensions
        resultCanvas.width = width;
        resultCanvas.height = height;

        const sourceCtx = sourceCanvas.getContext('2d');
        const originalImageData = sourceCtx.getImageData(0, 0, width, height);

        // 1. Export as JPEG at the given quality
        const jpegDataUrl = sourceCanvas.toDataURL('image/jpeg', config.quality / 100);

        // 2. Load the re-compressed JPEG back
        const img = new Image();
        img.onload = function() {
            // Create a temp canvas to read the re-compressed image data
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0);
            const recompressedImageData = tempCtx.getImageData(0, 0, width, height);

            const resultCtx = resultCanvas.getContext('2d');
            const resultImageData = resultCtx.createImageData(width, height);

            const origData = originalImageData.data;
            const recompData = recompressedImageData.data;
            const resData = resultImageData.data;

            // Helper function for Heatmap colorization
            // Blue -> Green -> Yellow -> Red
            function valueToHeatmap(val) {
                let r = 0, g = 0, b = 0;
                let v = Math.min(255, Math.max(0, val)) / 255;
                if (v < 0.25) {
                    // Blue to Cyan
                    b = 255;
                    g = Math.round(v * 4 * 255);
                } else if (v < 0.5) {
                    // Cyan to Green
                    g = 255;
                    b = Math.round((0.5 - v) * 4 * 255);
                } else if (v < 0.75) {
                    // Green to Yellow
                    g = 255;
                    r = Math.round((v - 0.5) * 4 * 255);
                } else {
                    // Yellow to Red
                    r = 255;
                    g = Math.round((1.0 - v) * 4 * 255);
                }
                return [r, g, b];
            }

            // 3. Compute absolute difference, apply scale and output
            for (let i = 0; i < origData.length; i += 4) {
                // Compute differences for R, G, B channels
                let diffR = Math.abs(origData[i] - recompData[i]);
                let diffG = Math.abs(origData[i + 1] - recompData[i + 1]);
                let diffB = Math.abs(origData[i + 2] - recompData[i + 2]);

                // Scale the error
                let scaledR = Math.min(255, diffR * config.scale);
                let scaledG = Math.min(255, diffG * config.scale);
                let scaledB = Math.min(255, diffB * config.scale);

                if (config.heatmap) {
                    // Use luminance of the scaled difference to determine heatmap intensity
                    let intensity = 0.299 * scaledR + 0.587 * scaledG + 0.114 * scaledB;
                    let heatmapColor = valueToHeatmap(intensity);
                    resData[i] = heatmapColor[0];
                    resData[i + 1] = heatmapColor[1];
                    resData[i + 2] = heatmapColor[2];
                } else {
                    resData[i] = scaledR;
                    resData[i + 1] = scaledG;
                    resData[i + 2] = scaledB;
                }
                
                // Alpha channel is fully opaque
                resData[i + 3] = 255; 
            }

            // 4. Draw the result
            resultCtx.putImageData(resultImageData, 0, 0);
            resolve();
        };
        img.onerror = reject;
        img.src = jpegDataUrl;
    });
};
