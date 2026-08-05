/**
 * Copy-Move Forgery Detection Module
 * 
 * Detects cloned regions within an image by dividing the image into overlapping blocks,
 * computing feature vectors for each block, sorting them lexicographically, and 
 * matching adjacent blocks in the sorted list that are close in feature space but 
 * distant in spatial space.
 * 
 * Computational Complexity: O(N log N) where N is the number of blocks, dominated by sorting.
 */

window.performCopyMoveDetection = function(sourceCanvas, resultCanvas, options) {
    // Default options
    const opt = Object.assign({
        blockSize: 16,
        threshold: 8,
        minDistance: 5
    }, options);

    const bSize = opt.blockSize;
    const step = Math.floor(bSize / 2); // 50% overlap

    // Downscale if image is too large to maintain performance
    const MAX_DIM = 800;
    let width = sourceCanvas.width;
    let height = sourceCanvas.height;
    let scale = 1.0;

    if (width > MAX_DIM || height > MAX_DIM) {
        scale = MAX_DIM / Math.max(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
    }

    // Prepare processing canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(sourceCanvas, 0, 0, width, height);

    const imgData = tempCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Convert to grayscale
    const gray = new Uint8Array(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        // Luminance formula
        gray[j] = Math.round(data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
    }

    // Function to get pixel value (with edge clamping)
    const getPixel = (x, y) => {
        x = Math.max(0, Math.min(x, width - 1));
        y = Math.max(0, Math.min(y, height - 1));
        return gray[y * width + x];
    };

    const blocks = [];

    // Extract blocks and compute feature vectors
    for (let y = 0; y <= height - bSize; y += step) {
        for (let x = 0; x <= width - bSize; x += step) {
            let sum = 0;
            let sumSq = 0;
            let gradX = 0;
            let gradY = 0;

            for (let by = 0; by < bSize; by++) {
                for (let bx = 0; bx < bSize; bx++) {
                    const px = x + bx;
                    const py = y + by;
                    const val = getPixel(px, py);
                    
                    sum += val;
                    sumSq += val * val;

                    // Compute simple gradients
                    if (bx < bSize - 1) gradX += Math.abs(getPixel(px + 1, py) - val);
                    if (by < bSize - 1) gradY += Math.abs(getPixel(px, py + 1) - val);
                }
            }

            const area = bSize * bSize;
            const mean = sum / area;
            // Variance = E[X^2] - (E[X])^2
            const variance = (sumSq / area) - (mean * mean);
            const stdDev = Math.sqrt(Math.max(0, variance));

            blocks.push({
                x, y,
                features: [mean, stdDev, gradX, gradY]
            });
        }
    }

    // Lexicographical sort based on features
    blocks.sort((a, b) => {
        for (let i = 0; i < 4; i++) {
            if (Math.abs(a.features[i] - b.features[i]) > 0.01) {
                return a.features[i] - b.features[i];
            }
        }
        return 0;
    });

    const matches = [];

    // Compare adjacent sorted blocks
    for (let i = 0; i < blocks.length - 1; i++) {
        const b1 = blocks[i];
        let j = i + 1;
        // Check a small window of adjacent blocks
        while (j < blocks.length && j <= i + 5) {
            const b2 = blocks[j];
            
            // Calculate feature distance (sum of absolute differences)
            let featureDist = 0;
            for (let k = 0; k < 4; k++) {
                featureDist += Math.abs(b1.features[k] - b2.features[k]);
            }
            
            // Average per-channel difference
            featureDist = featureDist / 4;

            if (featureDist <= opt.threshold) {
                // Calculate spatial distance
                const spatialDist = Math.sqrt(
                    Math.pow((b1.x - b2.x) / step, 2) + 
                    Math.pow((b1.y - b2.y) / step, 2)
                );

                if (spatialDist >= opt.minDistance) {
                    matches.push([b1, b2]);
                }
            }
            j++;
        }
    }

    // Setup result canvas
    resultCanvas.width = sourceCanvas.width;
    resultCanvas.height = sourceCanvas.height;
    const resCtx = resultCanvas.getContext('2d');

    // Draw original image dimmed
    resCtx.globalAlpha = 0.5;
    resCtx.drawImage(sourceCanvas, 0, 0);
    resCtx.globalAlpha = 1.0;

    // Draw matches
    resCtx.lineWidth = 2;
    resCtx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    resCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';

    // Scale back up to original size
    const drawX = (x) => Math.floor(x / scale);
    const drawY = (y) => Math.floor(y / scale);
    const drawSize = Math.floor(bSize / scale);

    matches.forEach(match => {
        const p1 = match[0];
        const p2 = match[1];

        // Draw rects
        resCtx.fillRect(drawX(p1.x), drawY(p1.y), drawSize, drawSize);
        resCtx.strokeRect(drawX(p1.x), drawY(p1.y), drawSize, drawSize);
        
        resCtx.fillRect(drawX(p2.x), drawY(p2.y), drawSize, drawSize);
        resCtx.strokeRect(drawX(p2.x), drawY(p2.y), drawSize, drawSize);

        // Draw line between centers
        resCtx.beginPath();
        resCtx.moveTo(drawX(p1.x) + drawSize/2, drawY(p1.y) + drawSize/2);
        resCtx.lineTo(drawX(p2.x) + drawSize/2, drawY(p2.y) + drawSize/2);
        resCtx.stroke();
    });
};
