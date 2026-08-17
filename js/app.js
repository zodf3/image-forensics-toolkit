/* ============================================
   ForensicLens v2 — Main Application Controller
   Orchestrates: file upload, tool tabs, canvas
   rendering, Privacy Guard, histogram, and export.
   ============================================ */

(function () {
    'use strict';

    // ── DOM References ──
    var uploadScreen   = document.getElementById('upload-screen');
    var analysisScreen = document.getElementById('analysis-screen');
    var dropZone       = document.getElementById('drop-zone');
    var fileInput      = document.getElementById('file-input');
    var btnChangeImage = document.getElementById('btn-change-image');
    var btnExport      = document.getElementById('btn-export');

    var originalCanvas = document.getElementById('original-canvas');
    var resultCanvas   = document.getElementById('result-canvas');
    var resultLabel    = document.getElementById('result-label');
    var processingOverlay = document.getElementById('processing-overlay');

    var canvasArea     = document.getElementById('canvas-area');
    var privacyArea    = document.getElementById('privacy-area');
    var controlsSidebar = document.getElementById('controls-sidebar');
    var histogramBox   = document.getElementById('histogram-box');

    var infoName = document.getElementById('info-name');
    var infoDims = document.getElementById('info-dims');
    var infoSize = document.getElementById('info-size');

    var toolTitle  = document.getElementById('tool-title');
    var toolDesc   = document.getElementById('tool-desc');


    var histogramCanvas = document.getElementById('histogram-canvas');

    // Privacy Guard elements
    var privPreview   = document.getElementById('priv-preview');
    var privStatus    = document.getElementById('priv-status');
    var privStatusText = document.getElementById('priv-status-text');
    var privMetadata  = document.getElementById('priv-metadata');
    var privNoData    = document.getElementById('priv-no-data');
    var mapNoGps      = document.getElementById('map-no-gps');
    var pulseDot      = document.getElementById('pulse-dot');
    var btnScrub      = document.getElementById('btn-scrub');
    var scrubDone     = document.getElementById('scrub-done');
    var btnDownloadSafe = document.getElementById('btn-download-safe');

    var originalCtx = originalCanvas.getContext('2d');
    var resultCtx   = resultCanvas.getContext('2d');

    // ── State ──
    var currentFile  = null;
    var currentImage = null;
    var currentTool  = 'ela';
    var mapInitialized = false;

    // ── Tool Metadata ──
    var toolMeta = {
        ela: {
            title: 'Error Level Analysis (ELA)',
            desc: 'Re-compresses the image at a known JPEG quality and highlights pixel-level differences. Tampered regions appear brighter because they have a different compression history.',
            label: 'ELA Result',
            dip: ['JPEG Compression (DCT)', 'Error Quantization', 'Pixel-wise Difference', 'Contrast Stretching', 'Pseudocolor Mapping']
        },
        noise: {
            title: 'Noise Pattern Analysis',
            desc: 'Extracts the noise residual by subtracting a Gaussian-blurred version. Inconsistent noise across regions suggests the image was spliced from different sources.',
            label: 'Noise Residual',
            dip: ['Gaussian Kernel Generation', 'Separable Convolution', 'Low-pass Filtering', 'High-pass Filtering', 'Noise Residual Extraction']
        },
        copymove: {
            title: 'Copy-Move Forgery Detection',
            desc: 'Detects duplicated (cloned) regions within the same image using block-based feature matching with lexicographic sorting.',
            label: 'Matched Regions',
            dip: ['Grayscale Conversion (BT.601)', 'Block Decomposition', 'Feature Vector Extraction', 'Lexicographic Sorting', 'Block Matching']
        },
        channels: {
            title: 'Color Channel Analysis',
            desc: 'Splits the image into individual R, G, B, Luminance, Hue, or Saturation channels. Channel inconsistencies can reveal artificial color alterations.',
            label: 'Channel View',
            dip: ['Color Channel Decomposition', 'RGB ↔ HSL Conversion', 'BT.601 Luminance', 'Pseudocolor Rendering']
        },
        edges: {
            title: 'Edge & Gradient Detection',
            desc: 'Applies convolution-based edge operators (Sobel, Laplacian, Prewitt, Roberts, Scharr) to reveal boundaries. Editing artifacts produce unnatural edge patterns.',
            label: 'Edge Map',
            dip: ['2D Convolution', 'Sobel / Prewitt / Scharr Operators', 'Laplacian (2nd Derivative)', 'Gradient Magnitude', 'Thresholding & Normalization']
        },
        privacy: {
            title: 'Privacy Guard',
            desc: 'Extracts hidden EXIF metadata (camera, GPS, timestamps) and visualizes location data on a map. Includes a scrubber to strip all metadata before sharing.',
            label: 'Privacy Analysis',
            dip: ['JPEG/TIFF Binary Parsing', 'EXIF IFD Structure', 'GPS Rational-to-Decimal Conversion', 'Canvas-based Metadata Stripping']
        }
    };

    // ============================================
    //  FILE UPLOAD
    // ============================================
    dropZone.addEventListener('click', function () { fileInput.click(); });

    fileInput.addEventListener('change', function (e) {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', function () {
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });

    btnChangeImage.addEventListener('click', function () {
        analysisScreen.classList.remove('active');
        uploadScreen.classList.add('active');
        fileInput.value = '';
        currentFile = null;
        currentImage = null;
        btnExport.disabled = true;
        resetPrivacyUI();
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPEG, PNG, WebP).');
            return;
        }
        currentFile = file;

        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                currentImage = img;
                showAnalysis(file, img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showAnalysis(file, img) {
        infoName.innerHTML = '<i class="fa-regular fa-image"></i> ' + file.name;
        infoDims.innerHTML = '<i class="fa-solid fa-expand"></i> ' + img.naturalWidth + ' × ' + img.naturalHeight;
        infoSize.innerHTML = '<i class="fa-solid fa-weight-hanging"></i> ' + formatFileSize(file.size);

        originalCanvas.width = img.naturalWidth;
        originalCanvas.height = img.naturalHeight;
        originalCtx.drawImage(img, 0, 0);

        resultCanvas.width = img.naturalWidth;
        resultCanvas.height = img.naturalHeight;

        uploadScreen.classList.remove('active');
        analysisScreen.classList.add('active');

        // Set privacy preview
        privPreview.src = URL.createObjectURL(file);

        drawHistogram(originalCanvas);
        switchToTool(currentTool);
    }

    // ============================================
    //  TOOL TABS
    // ============================================
    document.querySelectorAll('.tool-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            var tool = tab.dataset.tool;
            if (tool === currentTool) return;
            switchToTool(tool);
        });
    });

    function switchToTool(tool) {
        // Update tab styling
        document.querySelectorAll('.tool-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelector('.tool-tab[data-tool="' + tool + '"]').classList.add('active');

        // Update controls
        document.querySelectorAll('.tool-controls').forEach(function (c) { c.classList.remove('active'); });
        document.getElementById(tool + '-controls').classList.add('active');

        // Update description & DIP concepts
        var meta = toolMeta[tool];
        toolTitle.textContent = meta.title;
        toolDesc.textContent = meta.desc;
        resultLabel.textContent = meta.label;



        // Show/hide canvas vs privacy layout
        if (tool === 'privacy') {
            canvasArea.style.display = 'none';
            privacyArea.style.display = 'block';
            histogramBox.style.display = 'none';
            btnExport.style.display = 'none';


            // Init map if needed
            if (!mapInitialized) {
                window.MapController.init('leaflet-map');
                mapInitialized = true;
            } else {
                window.MapController.refresh();
            }

            // Run privacy analysis
            if (currentFile) runPrivacyAnalysis();
        } else {
            canvasArea.style.display = '';
            privacyArea.style.display = 'none';
            histogramBox.style.display = '';
            btnExport.style.display = '';


            if (currentImage) runTool(tool);
        }

        currentTool = tool;
    }

    // ============================================
    //  DIP TOOL EXECUTION
    // ============================================
    document.querySelectorAll('.btn-run').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var tool = btn.dataset.tool;
            if (currentImage) runTool(tool);
        });
    });

    function runTool(tool) {
        if (!currentImage) return;
        showProcessing(true);
        btnExport.disabled = true;

        requestAnimationFrame(function () {
            setTimeout(function () {
                try {
                    switch (tool) {
                        case 'ela':      runELA(); break;
                        case 'noise':    runNoise(); break;
                        case 'copymove': runCopyMove(); break;
                        case 'channels': runChannels(); break;
                        case 'edges':    runEdges(); break;
                    }
                } catch (err) {
                    console.error('Error running ' + tool + ':', err);
                    showProcessing(false);
                }
            }, 50);
        });
    }

    function runELA() {
        var opts = {
            quality: parseInt(document.getElementById('ela-quality').value),
            scale: parseInt(document.getElementById('ela-scale').value),
            heatmap: document.getElementById('ela-heatmap').checked
        };
        window.performELA(originalCanvas, resultCanvas, opts).then(function () {
            showProcessing(false); btnExport.disabled = false; drawHistogram(resultCanvas);
        });
    }

    function runNoise() {
        var opts = {
            radius: parseInt(document.getElementById('noise-radius').value),
            amplification: parseInt(document.getElementById('noise-amp').value),
            invert: document.getElementById('noise-invert').checked
        };
        window.performNoiseAnalysis(originalCanvas, resultCanvas, opts);
        showProcessing(false); btnExport.disabled = false; drawHistogram(resultCanvas);
    }

    function runCopyMove() {
        var opts = {
            blockSize: parseInt(document.getElementById('cm-block').value),
            threshold: parseInt(document.getElementById('cm-thresh').value),
            minDistance: parseInt(document.getElementById('cm-mindist').value)
        };
        window.performCopyMoveDetection(originalCanvas, resultCanvas, opts);
        showProcessing(false); btnExport.disabled = false;
    }

    function runChannels() {
        var opts = {
            channel: document.getElementById('channel-select').value,
            showInColor: document.getElementById('channel-color').checked
        };
        window.performChannelAnalysis(originalCanvas, resultCanvas, opts);
        showProcessing(false); btnExport.disabled = false; drawHistogram(resultCanvas);
    }

    function runEdges() {
        var opts = {
            method: document.getElementById('edge-method').value,
            threshold: parseInt(document.getElementById('edge-thresh').value),
            overlay: document.getElementById('edge-overlay').checked
        };
        window.performEdgeDetection(originalCanvas, resultCanvas, opts);
        showProcessing(false); btnExport.disabled = false; drawHistogram(resultCanvas);
    }

    // ============================================
    //  PRIVACY GUARD
    // ============================================

    /* ═══════════════════════════════════════════════
       📐 DIP: EXIF BINARY PARSING
       Reads raw JPEG bytes to extract EXIF metadata
       from the APP1 marker. Parses TIFF IFD entries
       for camera info and GPS coordinates.
       ═══════════════════════════════════════════════ */

    function runPrivacyAnalysis() {
        if (!currentFile) return;

        resetPrivacyUI();
        privStatusText.textContent = 'Scanning...';

        parseExif(currentFile).then(function (meta) {
            if (meta.hasData) {
                privNoData.style.display = 'none';
                privMetadata.style.display = 'flex';
                privStatus.className = 'priv-status priv-status-warning';
                privStatusText.textContent = '⚠ Hidden Data Found';
                btnScrub.style.display = '';

                // Render extracted fields
                if (meta.camera.Make)     addMetaRow('Camera Make', meta.camera.Make);
                if (meta.camera.Model)    addMetaRow('Camera Model', meta.camera.Model);
                if (meta.camera.Software) addMetaRow('Software', meta.camera.Software);
                if (meta.details.Date)    addMetaRow('Date Taken', meta.details.Date);

                if (meta.gps) {
                    addMetaRow('GPS Latitude', meta.gps.lat.toFixed(6), true);
                    addMetaRow('GPS Longitude', meta.gps.lng.toFixed(6), true);

                    // Show map
                    mapNoGps.style.display = 'none';
                    pulseDot.classList.add('active');
                    window.MapController.plotLocation(meta.gps.lat, meta.gps.lng);
                }
            } else {
                privNoData.style.display = 'block';
                privMetadata.style.display = 'none';
                privStatus.className = 'priv-status priv-status-safe';
                privStatusText.textContent = '✓ No Hidden Data';
                btnScrub.style.display = 'none';
            }
        });
    }

    function addMetaRow(key, value, isDanger) {
        var row = document.createElement('div');
        row.className = 'meta-row';
        row.innerHTML = '<span class="meta-key">' + key + '</span><span class="meta-val' + (isDanger ? ' danger' : '') + '">' + value + '</span>';
        privMetadata.appendChild(row);
    }

    function resetPrivacyUI() {
        privMetadata.innerHTML = '';
        privNoData.style.display = 'none';
        mapNoGps.style.display = 'flex';
        pulseDot.classList.remove('active');
        scrubDone.style.display = 'none';
        btnScrub.style.display = '';
        btnScrub.disabled = false;
        btnScrub.innerHTML = '<i class="fa-solid fa-eraser"></i> Scrub My Photo';
        window.MapController.reset();
    }

    // Scrub button
    btnScrub.addEventListener('click', function () {
        if (!currentFile) return;
        btnScrub.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Scrubbing...';
        btnScrub.disabled = true;

        window.Scrubber.scrubImage(currentFile).then(function (blob) {
            var url = URL.createObjectURL(blob);
            var baseName = currentFile.name.replace(/\.[^.]+$/, '');
            btnDownloadSafe.href = url;
            btnDownloadSafe.download = baseName + '_safe.jpg';

            btnScrub.style.display = 'none';
            scrubDone.style.display = 'block';
            privStatus.className = 'priv-status priv-status-safe';
            privStatusText.textContent = '✓ Metadata Removed';
        }).catch(function (err) {
            alert('Scrubbing failed: ' + err.message);
            btnScrub.innerHTML = '<i class="fa-solid fa-eraser"></i> Scrub My Photo';
            btnScrub.disabled = false;
        });
    });

    /* ═══════════════════════════════════════════════
       📐 DIP: EXIF / TIFF PARSER
       Parses the JPEG binary structure to extract
       EXIF data from IFD (Image File Directory)
       entries. Handles both little-endian and
       big-endian byte orders.
       ═══════════════════════════════════════════════ */
    function parseExif(file) {
        return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    var buf = e.target.result;
                    var view = new DataView(buf);
                    var result = { hasData: false, camera: {}, details: {}, gps: null };

                    // Check JPEG SOI marker
                    if (view.getUint16(0, false) !== 0xFFD8) { resolve(result); return; }

                    var offset = 2;
                    var exifStart = -1;

                    // Scan for APP1 (EXIF) marker
                    while (offset < view.byteLength - 4) {
                        var marker = view.getUint16(offset, false);
                        var segLen = view.getUint16(offset + 2, false);
                        if (marker === 0xFFE1) {
                            if (view.getUint32(offset + 4, false) === 0x45786966) { // "Exif"
                                exifStart = offset + 10;
                                break;
                            }
                        }
                        offset += 2 + segLen;
                    }

                    if (exifStart === -1) { resolve(result); return; }

                    result.hasData = true;
                    var byteOrder = view.getUint16(exifStart, false);
                    var le = (byteOrder === 0x4949); // little-endian
                    var tiffBase = exifStart;
                    var ifd0Off = view.getUint32(exifStart + 4, le);

                    var ifd0 = readIFD(view, tiffBase + ifd0Off, tiffBase, le);

                    if (ifd0[0x010F]) result.camera.Make     = readStr(view, ifd0[0x010F]);
                    if (ifd0[0x0110]) result.camera.Model    = readStr(view, ifd0[0x0110]);
                    if (ifd0[0x0131]) result.camera.Software = readStr(view, ifd0[0x0131]);
                    if (ifd0[0x0132]) result.details.Date    = readStr(view, ifd0[0x0132]);

                    /* ═══════════════════════════════════════════════
                       📐 DIP: GPS RATIONAL-TO-DECIMAL CONVERSION
                       EXIF stores GPS as three RATIONAL values
                       (degrees, minutes, seconds). Each RATIONAL is
                       a pair of uint32 (numerator/denominator).
                       Formula: decimal = deg + min/60 + sec/3600
                       ═══════════════════════════════════════════════ */
                    if (ifd0[0x8825]) {
                        var gpsOff = ifd0[0x8825].val;
                        var gpsIfd = readIFD(view, tiffBase + gpsOff, tiffBase, le);

                        var lat = parseGPS(view, gpsIfd[0x0002], le);
                        var lng = parseGPS(view, gpsIfd[0x0004], le);

                        if (lat !== null && lng !== null) {
                            var latRef = gpsIfd[0x0001] ? readStr(view, gpsIfd[0x0001]) : 'N';
                            var lngRef = gpsIfd[0x0003] ? readStr(view, gpsIfd[0x0003]) : 'E';
                            if (latRef === 'S') lat = -lat;
                            if (lngRef === 'W') lng = -lng;
                            result.gps = { lat: lat, lng: lng };
                        }
                    }

                    resolve(result);
                } catch (err) {
                    console.error('EXIF parse error:', err);
                    resolve({ hasData: false, camera: {}, details: {}, gps: null });
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    function readIFD(view, offset, base, le) {
        var count = view.getUint16(offset, le);
        var ifd = {};
        for (var i = 0; i < count; i++) {
            var o = offset + 2 + i * 12;
            var tag = view.getUint16(o, le);
            var type = view.getUint16(o + 2, le);
            var cnt = view.getUint32(o + 4, le);
            var valOff = o + 8;
            var byteLen = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8][type] * cnt || 0;
            var val = null;
            if (byteLen > 4) {
                valOff = base + view.getUint32(o + 8, le);
            } else if (type === 3) {
                val = view.getUint16(o + 8, le);
            } else if (type === 4) {
                val = view.getUint32(o + 8, le);
            }
            ifd[tag] = { type: type, count: cnt, off: valOff, val: val };
        }
        return ifd;
    }

    function readStr(view, entry) {
        var s = '';
        for (var i = 0; i < entry.count - 1; i++) {
            var c = view.getUint8(entry.off + i);
            if (c === 0) break;
            s += String.fromCharCode(c);
        }
        return s.trim();
    }

    function parseGPS(view, entry, le) {
        if (!entry || entry.type !== 5 || entry.count !== 3) return null;
        var o = entry.off;
        var dN = view.getUint32(o, le), dD = view.getUint32(o + 4, le);
        var mN = view.getUint32(o + 8, le), mD = view.getUint32(o + 12, le);
        var sN = view.getUint32(o + 16, le), sD = view.getUint32(o + 20, le);
        if (dD === 0 || mD === 0 || sD === 0) return null;
        return (dN / dD) + (mN / mD) / 60 + (sN / sD) / 3600;
    }

    // ============================================
    //  SLIDER VALUE DISPLAYS
    // ============================================
    var sliders = [
        { id: 'ela-quality',  disp: 'ela-quality-val', s: '%' },
        { id: 'ela-scale',    disp: 'ela-scale-val',   s: '×' },
        { id: 'noise-radius', disp: 'noise-radius-val', s: '' },
        { id: 'noise-amp',    disp: 'noise-amp-val',   s: '×' },
        { id: 'cm-block',     disp: 'cm-block-val',    s: 'px' },
        { id: 'cm-thresh',    disp: 'cm-thresh-val',   s: '' },
        { id: 'cm-mindist',   disp: 'cm-mindist-val',  s: '' },
        { id: 'edge-thresh',  disp: 'edge-thresh-val', s: '' }
    ];
    sliders.forEach(function (s) {
        var el = document.getElementById(s.id);
        var lb = document.getElementById(s.disp);
        if (el && lb) {
            el.addEventListener('input', function () { lb.textContent = el.value + s.s; });
        }
    });

    // ============================================
    //  HISTOGRAM
    // ============================================

    /* ═══════════════════════════════════════════════
       📐 DIP: HISTOGRAM COMPUTATION
       Computes intensity frequency distributions
       for R, G, B, and Luminance channels.
       The histogram is a fundamental DIP tool for
       understanding image contrast and exposure.
       ═══════════════════════════════════════════════ */
    function drawHistogram(canvas) {
        var ctx = canvas.getContext('2d');
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var d = imgData.data;

        var rB = new Uint32Array(256), gB = new Uint32Array(256);
        var bB = new Uint32Array(256), lB = new Uint32Array(256);

        for (var i = 0; i < d.length; i += 4) {
            rB[d[i]]++;
            gB[d[i + 1]]++;
            bB[d[i + 2]]++;
            lB[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
        }

        var maxV = 0;
        for (var j = 0; j < 256; j++) maxV = Math.max(maxV, rB[j], gB[j], bB[j]);

        var hCtx = histogramCanvas.getContext('2d');
        var w = histogramCanvas.width, h = histogramCanvas.height;
        hCtx.clearRect(0, 0, w, h);
        hCtx.fillStyle = 'rgba(0,0,0,0.3)';
        hCtx.fillRect(0, 0, w, h);

        var bw = w / 256;
        var chans = [
            { bins: rB, col: 'rgba(239,68,68,0.5)' },
            { bins: gB, col: 'rgba(34,197,94,0.5)' },
            { bins: bB, col: 'rgba(59,130,246,0.5)' }
        ];

        chans.forEach(function (ch) {
            hCtx.fillStyle = ch.col;
            hCtx.beginPath();
            hCtx.moveTo(0, h);
            for (var k = 0; k < 256; k++) {
                var bh = maxV > 0 ? (ch.bins[k] / maxV) * (h - 4) : 0;
                hCtx.lineTo(k * bw, h - bh);
            }
            hCtx.lineTo(w, h);
            hCtx.closePath();
            hCtx.fill();
        });

        // Luminance overlay
        var lumMax = 0;
        for (var m = 0; m < 256; m++) lumMax = Math.max(lumMax, lB[m]);
        hCtx.strokeStyle = 'rgba(255,255,255,0.35)';
        hCtx.lineWidth = 1;
        hCtx.beginPath();
        for (var n = 0; n < 256; n++) {
            var lh = lumMax > 0 ? (lB[n] / lumMax) * (h - 4) : 0;
            if (n === 0) hCtx.moveTo(0, h - lh);
            else hCtx.lineTo(n * bw, h - lh);
        }
        hCtx.stroke();
    }

    // ============================================
    //  EXPORT
    // ============================================
    btnExport.addEventListener('click', function () {
        if (resultCanvas.width === 0) return;
        var link = document.createElement('a');
        var base = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'image';
        link.download = base + '_' + currentTool + '_analysis.png';
        link.href = resultCanvas.toDataURL('image/png');
        link.click();
    });

    // ============================================
    //  UTILITIES
    // ============================================
    function showProcessing(show) {
        if (show) processingOverlay.classList.add('active');
        else processingOverlay.classList.remove('active');
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        var units = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
    }

})();
