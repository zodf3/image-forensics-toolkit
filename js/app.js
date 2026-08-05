/* ============================================
   ForensicLens — Main Application Controller
   Handles file upload, tab switching, tool
   orchestration, histogram, and export.
   ============================================ */

(function () {
    'use strict';

    // ---- DOM References ----
    const uploadSection  = document.getElementById('upload-section');
    const analysisSection = document.getElementById('analysis-section');
    const dropZone       = document.getElementById('drop-zone');
    const fileInput      = document.getElementById('file-input');
    const changeImageBtn = document.getElementById('change-image-btn');
    const exportBtn      = document.getElementById('export-btn');
    const originalCanvas = document.getElementById('original-canvas');
    const resultCanvas   = document.getElementById('result-canvas');
    const resultLabel    = document.getElementById('result-label');
    const imageName      = document.getElementById('image-name');
    const imageDimensions= document.getElementById('image-dimensions');
    const imageSize      = document.getElementById('image-size');
    const toolTitle      = document.getElementById('tool-title');
    const toolDesc       = document.getElementById('tool-desc');
    const processingInd  = document.getElementById('processing-indicator');
    const histogramCanvas= document.getElementById('histogram-canvas');

    const originalCtx = originalCanvas.getContext('2d');
    const resultCtx   = resultCanvas.getContext('2d');

    // ---- State ----
    let currentFile  = null;   // The File object
    let currentImage = null;   // HTMLImageElement
    let currentTool  = 'ela';

    // Tool metadata for descriptions
    const toolMeta = {
        ela: {
            title: 'Error Level Analysis (ELA)',
            desc: 'Re-compresses the image at a known JPEG quality and highlights pixel-level differences. Tampered or edited regions appear brighter because they have a different compression history than the rest of the image.',
            label: 'ELA Result'
        },
        noise: {
            title: 'Noise Analysis',
            desc: 'Extracts the noise residual by subtracting a blurred version from the original. Consistent noise suggests an untouched photo; inconsistent regions may indicate splicing or cloning from different sources.',
            label: 'Noise Residual'
        },
        copymove: {
            title: 'Copy-Move Detection',
            desc: 'Detects duplicated (cloned) regions within the same image by dividing it into blocks, computing feature vectors, and finding similar blocks that are far apart spatially.',
            label: 'Matched Regions'
        },
        metadata: {
            title: 'Metadata Extraction',
            desc: 'Reads EXIF and file metadata embedded in the image. Information like camera model, software used, GPS coordinates, and timestamps can reveal editing history or inconsistencies.',
            label: 'Metadata'
        },
        channels: {
            title: 'Channel Analysis',
            desc: 'Splits the image into individual color channels (R, G, B) or derived channels (Luminance, Hue, Saturation). Channel inconsistencies can expose regions where colors were artificially altered.',
            label: 'Channel View'
        },
        edges: {
            title: 'Edge & Gradient Detection',
            desc: 'Applies convolution-based edge operators (Sobel, Laplacian, Prewitt, Roberts, Scharr) to reveal boundaries. Editing artifacts often produce unnatural edge patterns at tampering boundaries.',
            label: 'Edge Map'
        }
    };

    // ============================================
    //  FILE UPLOAD
    // ============================================

    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Change image
    changeImageBtn.addEventListener('click', () => {
        uploadSection.style.display = '';
        analysisSection.style.display = 'none';
        fileInput.value = '';
        currentFile = null;
        currentImage = null;
        exportBtn.disabled = true;
    });

    // Handle file
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPEG, PNG, WebP, BMP).');
            return;
        }

        currentFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                showAnalysisView(file, img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Show analysis view
    function showAnalysisView(file, img) {
        // Update image info
        imageName.textContent = file.name;
        imageDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
        imageSize.textContent = formatFileSize(file.size);

        // Draw original image
        originalCanvas.width = img.naturalWidth;
        originalCanvas.height = img.naturalHeight;
        originalCtx.drawImage(img, 0, 0);

        // Setup result canvas
        resultCanvas.width = img.naturalWidth;
        resultCanvas.height = img.naturalHeight;

        // Switch views
        uploadSection.style.display = 'none';
        analysisSection.style.display = '';

        // Draw histogram of original
        drawHistogram(originalCanvas);

        // Run default tool
        runTool(currentTool);
    }

    // ============================================
    //  TOOL TABS
    // ============================================

    document.querySelectorAll('.tool-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tool = tab.dataset.tool;
            if (tool === currentTool) return;

            // Update tab styling
            document.querySelector('.tool-tab.active').classList.remove('active');
            tab.classList.add('active');

            // Update controls visibility
            document.querySelector('.tool-controls.active').classList.remove('active');
            document.getElementById(`${tool}-controls`).classList.add('active');

            // Update description
            toolTitle.textContent = toolMeta[tool].title;
            toolDesc.textContent = toolMeta[tool].desc;
            resultLabel.textContent = toolMeta[tool].label;

            currentTool = tool;

            // Run the tool (except metadata which needs the file, not re-run)
            if (currentImage) {
                runTool(tool);
            }
        });
    });

    // ============================================
    //  TOOL EXECUTION
    // ============================================

    // Run button handlers
    document.querySelectorAll('.btn-run').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if (currentImage) runTool(tool);
        });
    });

    function runTool(tool) {
        if (!currentImage) return;

        showProcessing(true);
        exportBtn.disabled = true;

        // Small delay so the UI updates before heavy computation
        requestAnimationFrame(() => {
            setTimeout(() => {
                try {
                    switch (tool) {
                        case 'ela':
                            runELA();
                            break;
                        case 'noise':
                            runNoise();
                            break;
                        case 'copymove':
                            runCopyMove();
                            break;
                        case 'metadata':
                            runMetadata();
                            break;
                        case 'channels':
                            runChannels();
                            break;
                        case 'edges':
                            runEdges();
                            break;
                    }
                } catch (err) {
                    console.error(`Error running ${tool}:`, err);
                    showProcessing(false);
                }
            }, 50);
        });
    }

    // ---- ELA ----
    function runELA() {
        const options = {
            quality: parseInt(document.getElementById('ela-quality').value),
            scale: parseInt(document.getElementById('ela-scale').value),
            heatmap: document.getElementById('ela-heatmap').checked
        };
        window.performELA(originalCanvas, resultCanvas, options).then(() => {
            showProcessing(false);
            exportBtn.disabled = false;
            drawHistogram(resultCanvas);
        });
    }

    // ---- Noise ----
    function runNoise() {
        const options = {
            radius: parseInt(document.getElementById('noise-radius').value),
            amplification: parseInt(document.getElementById('noise-amp').value),
            invert: document.getElementById('noise-invert').checked
        };
        window.performNoiseAnalysis(originalCanvas, resultCanvas, options);
        showProcessing(false);
        exportBtn.disabled = false;
        drawHistogram(resultCanvas);
    }

    // ---- Copy-Move ----
    function runCopyMove() {
        const options = {
            blockSize: parseInt(document.getElementById('cm-block').value),
            threshold: parseInt(document.getElementById('cm-thresh').value),
            minDistance: parseInt(document.getElementById('cm-mindist').value)
        };
        window.performCopyMoveDetection(originalCanvas, resultCanvas, options);
        showProcessing(false);
        exportBtn.disabled = false;
    }

    // ---- Metadata ----
    function runMetadata() {
        if (!currentFile) return;
        const outputEl = document.getElementById('metadata-output');
        window.extractMetadata(currentFile, outputEl).then(() => {
            showProcessing(false);
        });
        // Metadata doesn't draw to result canvas, show original
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        resultCtx.drawImage(currentImage, 0, 0);
        resultLabel.textContent = 'Original (See metadata panel →)';
    }

    // ---- Channels ----
    function runChannels() {
        const options = {
            channel: document.getElementById('channel-select').value,
            showInColor: document.getElementById('channel-color').checked
        };
        window.performChannelAnalysis(originalCanvas, resultCanvas, options);
        showProcessing(false);
        exportBtn.disabled = false;
        drawHistogram(resultCanvas);
    }

    // ---- Edges ----
    function runEdges() {
        const options = {
            method: document.getElementById('edge-method').value,
            threshold: parseInt(document.getElementById('edge-thresh').value),
            overlay: document.getElementById('edge-overlay').checked
        };
        window.performEdgeDetection(originalCanvas, resultCanvas, options);
        showProcessing(false);
        exportBtn.disabled = false;
        drawHistogram(resultCanvas);
    }

    // ============================================
    //  SLIDER VALUE DISPLAYS
    // ============================================

    const sliderBindings = [
        { id: 'ela-quality',  display: 'ela-quality-val', suffix: '%' },
        { id: 'ela-scale',   display: 'ela-scale-val',  suffix: '×' },
        { id: 'noise-radius', display: 'noise-radius-val', suffix: '' },
        { id: 'noise-amp',   display: 'noise-amp-val',  suffix: '×' },
        { id: 'cm-block',    display: 'cm-block-val',   suffix: 'px' },
        { id: 'cm-thresh',   display: 'cm-thresh-val',  suffix: '' },
        { id: 'cm-mindist',  display: 'cm-mindist-val', suffix: '' },
        { id: 'edge-thresh', display: 'edge-thresh-val', suffix: '' }
    ];

    sliderBindings.forEach(({ id, display, suffix }) => {
        const slider = document.getElementById(id);
        const label  = document.getElementById(display);
        if (slider && label) {
            slider.addEventListener('input', () => {
                label.textContent = slider.value + suffix;
            });
        }
    });

    // ============================================
    //  HISTOGRAM
    // ============================================

    function drawHistogram(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Initialize bins
        const rBins = new Uint32Array(256);
        const gBins = new Uint32Array(256);
        const bBins = new Uint32Array(256);
        const lumBins = new Uint32Array(256);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            rBins[r]++;
            gBins[g]++;
            bBins[b]++;
            const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            lumBins[lum]++;
        }

        // Find max for normalization
        let maxVal = 0;
        for (let i = 0; i < 256; i++) {
            maxVal = Math.max(maxVal, rBins[i], gBins[i], bBins[i]);
        }

        // Draw
        const hCtx = histogramCanvas.getContext('2d');
        const w = histogramCanvas.width;
        const h = histogramCanvas.height;
        hCtx.clearRect(0, 0, w, h);

        // Background
        hCtx.fillStyle = 'rgba(0,0,0,0.3)';
        hCtx.fillRect(0, 0, w, h);

        const barWidth = w / 256;

        // Draw each channel with transparency
        const channels = [
            { bins: rBins, color: 'rgba(239, 68, 68, 0.5)' },
            { bins: gBins, color: 'rgba(34, 197, 94, 0.5)' },
            { bins: bBins, color: 'rgba(59, 130, 246, 0.5)' }
        ];

        channels.forEach(({ bins, color }) => {
            hCtx.fillStyle = color;
            hCtx.beginPath();
            hCtx.moveTo(0, h);
            for (let i = 0; i < 256; i++) {
                const barH = maxVal > 0 ? (bins[i] / maxVal) * (h - 4) : 0;
                hCtx.lineTo(i * barWidth, h - barH);
            }
            hCtx.lineTo(w, h);
            hCtx.closePath();
            hCtx.fill();
        });

        // Luminance overlay
        hCtx.strokeStyle = 'rgba(255,255,255,0.4)';
        hCtx.lineWidth = 1;
        hCtx.beginPath();
        let lumMax = 0;
        for (let i = 0; i < 256; i++) lumMax = Math.max(lumMax, lumBins[i]);
        for (let i = 0; i < 256; i++) {
            const barH = lumMax > 0 ? (lumBins[i] / lumMax) * (h - 4) : 0;
            if (i === 0) hCtx.moveTo(i * barWidth, h - barH);
            else hCtx.lineTo(i * barWidth, h - barH);
        }
        hCtx.stroke();
    }

    // ============================================
    //  EXPORT
    // ============================================

    exportBtn.addEventListener('click', () => {
        if (resultCanvas.width === 0) return;

        const link = document.createElement('a');
        const toolName = currentTool;
        const baseName = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'image';
        link.download = `${baseName}_${toolName}_analysis.png`;
        link.href = resultCanvas.toDataURL('image/png');
        link.click();
    });

    // ============================================
    //  UTILITIES
    // ============================================

    function showProcessing(show) {
        processingInd.style.display = show ? 'flex' : 'none';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
    }

})();
