/* ═══════════════════════════════════════════════
   📐 DIP: COPY-MOVE FORGERY DETECTION
   Detects cloned regions by extracting block features, sorting, and matching
   ═══════════════════════════════════════════════ */

window.performCopyMoveDetection = function(sourceCanvas, resultCanvas, options) {
    const opts = Object.assign({ blockSize: 16, threshold: 8, minDistance: 5 }, options);
    const ctx = sourceCanvas.getContext('2d', {willReadFrequently: true});
    let width = sourceCanvas.width;
    let height = sourceCanvas.height;
    
    // Copy to result canvas
    resultCanvas.width = width;
    resultCanvas.height = height;
    const resCtx = resultCanvas.getContext('2d');
    resCtx.drawImage(sourceCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    /* ═══════════════════════════════════════════════
       📐 DIP: GRAYSCALE CONVERSION / LUMINANCE
       Convert image to grayscale using BT.601: Y = 0.299R + 0.587G + 0.114B
       ═══════════════════════════════════════════════ */
    const grayData = new Float32Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        // Luminance calculation
        grayData[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    /* ═══════════════════════════════════════════════
       📐 DIP: IMAGE DOWNSAMPLING
       Downscale if image is large (>800px) for performance
       ═══════════════════════════════════════════════ */
    let scale = 1;
    let procWidth = width;
    let procHeight = height;
    let procGray = grayData;

    if (Math.max(width, height) > 800) {
        scale = 800 / Math.max(width, height);
        procWidth = Math.floor(width * scale);
        procHeight = Math.floor(height * scale);
        procGray = new Float32Array(procWidth * procHeight);
        
        // Nearest neighbor downsampling
        for (let y = 0; y < procHeight; y++) {
            for (let x = 0; x < procWidth; x++) {
                const srcX = Math.floor(x / scale);
                const srcY = Math.floor(y / scale);
                procGray[y * procWidth + x] = grayData[srcY * width + srcX];
            }
        }
    }

    /* ═══════════════════════════════════════════════
       📐 DIP: BLOCK DECOMPOSITION
       Divide into overlapping blocks (step = blockSize/2)
       ═══════════════════════════════════════════════ */
    const blockSize = opts.blockSize;
    const step = Math.floor(blockSize / 2);
    const blocks = [];

    for (let y = 0; y <= procHeight - blockSize; y += step) {
        for (let x = 0; x <= procWidth - blockSize; x += step) {
            
            /* ═══════════════════════════════════════════════
               📐 DIP: FEATURE VECTOR EXTRACTION
               [mean intensity, standard deviation, horizontal gradient sum, vertical gradient sum]
               ═══════════════════════════════════════════════ */
            let sum = 0;
            let sumSq = 0;
            let hGrad = 0;
            let vGrad = 0;
            
            for (let by = 0; by < blockSize; by++) {
                for (let bx = 0; bx < blockSize; bx++) {
                    const idx = (y + by) * procWidth + (x + bx);
                    const val = procGray[idx];
                    sum += val;
                    sumSq += val * val;
                    
                    // Simple pixel difference gradients
                    if (bx < blockSize - 1) {
                        hGrad += Math.abs(procGray[idx + 1] - val);
                    }
                    if (by < blockSize - 1) {
                        vGrad += Math.abs(procGray[idx + procWidth] - val);
                    }
                }
            }
            
            const n = blockSize * blockSize;
            const mean = sum / n;
            const variance = (sumSq / n) - (mean * mean);
            const stdDev = variance > 0 ? Math.sqrt(variance) : 0;
            
            blocks.push({
                x, y,
                f: [mean, stdDev, hGrad, vGrad]
            });
        }
    }

    /* ═══════════════════════════════════════════════
       📐 DIP: LEXICOGRAPHIC SORTING / BLOCK MATCHING
       Sort blocks by feature vectors, compare adjacent sorted blocks.
       Complexity: O(N log N)
       ═══════════════════════════════════════════════ */
    blocks.sort((a, b) => {
        for (let i = 0; i < 4; i++) {
            if (a.f[i] !== b.f[i]) return a.f[i] - b.f[i];
        }
        return 0;
    });

    const matches = [];
    const threshold = opts.threshold;
    const minDistance = opts.minDistance;

    for (let i = 0; i < blocks.length - 1; i++) {
        const b1 = blocks[i];
        const b2 = blocks[i + 1];
        
        let featDistSq = 0;
        for (let j = 0; j < 4; j++) {
            const diff = b1.f[j] - b2.f[j];
            featDistSq += diff * diff;
        }
        const featDist = Math.sqrt(featDistSq);
        
        if (featDist < threshold) {
            const dx = b1.x - b2.x;
            const dy = b1.y - b2.y;
            const spatialDist = Math.sqrt(dx * dx + dy * dy);
            
            if (spatialDist >= minDistance) {
                matches.push([b1, b2]);
            }
        }
    }

    /* ═══════════════════════════════════════════════
       📐 DIP: VISUALIZATION / OVERLAY RENDERING
       Draw original dimmed, highlight matched block pairs with colored rectangles and connecting lines
       ═══════════════════════════════════════════════ */
    // Dim the original image
    resCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    resCtx.fillRect(0, 0, width, height);
    
    // Reverse scaling for drawing
    const drawScale = 1 / scale;
    const drawBlockSize = blockSize * drawScale;

    resCtx.lineWidth = 2;
    for (const match of matches) {
        const [b1, b2] = match;
        
        const x1 = b1.x * drawScale;
        const y1 = b1.y * drawScale;
        const x2 = b2.x * drawScale;
        const y2 = b2.y * drawScale;
        
        // Random color for each matched pair
        const hue = Math.random() * 360;
        const color = `hsl(${hue}, 100%, 50%)`;
        
        resCtx.strokeStyle = color;
        
        // Draw matched blocks
        resCtx.strokeRect(x1, y1, drawBlockSize, drawBlockSize);
        resCtx.strokeRect(x2, y2, drawBlockSize, drawBlockSize);
        
        // Draw connecting line between matched blocks
        resCtx.beginPath();
        resCtx.moveTo(x1 + drawBlockSize / 2, y1 + drawBlockSize / 2);
        resCtx.lineTo(x2 + drawBlockSize / 2, y2 + drawBlockSize / 2);
        resCtx.stroke();
    }
};
