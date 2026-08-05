# 🔬 ForensicLens — Digital Image Forensics Toolkit

<div align="center">

![ForensicLens Banner](https://img.shields.io/badge/ForensicLens-Image%20Forensics-00d2ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xNS41IDEyYzIuNzUgMCA0Ljk4LTIuMjQgNC45OC00Ljk5QzIwLjQ4IDQuMjQgMTguMjUgMiAxNS41IDJTMTAuNTIgNC4yNCAxMC41MiA3LjAxQzEwLjUyIDkuNzYgMTIuNzUgMTIgMTUuNSAxMnptLTcgMEMxMS43NSAxMiAxNCAxNC4yNCAxNCAxN3MtMi4yNSA1LTUgNS01LTIuMjQtNS01IDIuMjUtNSA1LTV6Ii8+PC9zdmc+)

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Canvas API](https://img.shields.io/badge/Canvas_API-FF6F00?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

**A browser-based image forensics toolkit for detecting tampering, forgery, and manipulation using Digital Image Processing techniques.**

[Features](#-features) · [Demo](#-quick-start) · [Tools](#-forensic-tools) · [DIP Concepts](#-dip-concepts-covered) · [Contributing](#-contributing)

</div>

---

## 📋 Overview

**ForensicLens** is a client-side web application that provides a suite of digital image forensics tools. It allows users to analyze images for signs of tampering, forgery, and manipulation — all running directly in the browser using the **Canvas API** with **zero dependencies** and **no server required**.

Built as a **Digital Image Processing (DIP) Lab** project, it demonstrates core DIP algorithms including convolution, filtering, edge detection, color space conversion, and compression analysis through an interactive, real-time interface.

## ✨ Features

- 🔬 **6 Forensic Analysis Tools** — ELA, Noise Analysis, Copy-Move Detection, Metadata Extraction, Channel Analysis, Edge Detection
- 🖥️ **100% Client-Side** — No server, no installation, no dependencies. Just open `index.html`
- ⚡ **Real-Time Processing** — Adjust parameters with sliders and see results instantly
- 🎨 **Premium Dark UI** — Glassmorphism design with smooth animations
- 📊 **Live Histogram** — RGB + Luminance histogram updates with each analysis
- 💾 **Export Results** — Download analyzed images as PNG
- 📱 **Responsive Layout** — Works on desktop, tablet, and mobile
- 🔒 **Privacy-First** — All processing happens locally; no data leaves your browser

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/zodf3/image-forensics-toolkit.git

# Open in browser (no build step needed!)
cd image-forensics-toolkit

# Option 1: Double-click index.html

# Option 2: Use a local server (recommended for full EXIF parsing)
npx serve .
# or
python -m http.server 8080
```

> **Note:** Opening `index.html` directly works for all tools. Using a local server is only needed if you encounter CORS issues with certain file operations.

## 🔬 Forensic Tools

### 1. Error Level Analysis (ELA)

Re-compresses the image at a known JPEG quality and highlights pixel-level differences. **Tampered regions appear brighter** because they have a different compression history than the rest of the image.

| Parameter | Range | Description |
|-----------|-------|-------------|
| JPEG Quality | 5–99% | Re-compression quality level |
| Amplification | 1–80× | Error amplification multiplier |
| Heatmap | On/Off | Colorize output (blue → green → yellow → red) |

### 2. Noise Analysis

Extracts the noise residual by subtracting a Gaussian-blurred version from the original. **Inconsistent noise patterns** across regions suggest the image has been spliced from different sources.

| Parameter | Range | Description |
|-----------|-------|-------------|
| Blur Kernel | 1–15 | Gaussian blur kernel size (odd values) |
| Amplification | 1–40× | Noise amplification factor |
| Invert | On/Off | Invert the noise output |

### 3. Copy-Move Detection

Detects **duplicated (cloned) regions** within the same image using block-based feature matching with lexicographic sorting. Matched regions are highlighted with colored rectangles and connecting lines.

| Parameter | Range | Description |
|-----------|-------|-------------|
| Block Size | 8–48px | Size of comparison blocks |
| Threshold | 1–40 | Similarity threshold for matching |
| Min Distance | 2–20 | Minimum spatial distance between matches |

### 4. Metadata (EXIF) Extraction

Reads raw JPEG bytes to parse **EXIF data** including camera model, timestamps, GPS coordinates, and editing software. **Flags suspicious indicators** like Photoshop or GIMP in the software field.

**Extracted Data:**
- File Information (name, size, type, last modified)
- Camera Information (make, model, software)
- EXIF Details (exposure time, f-number, ISO, focal length)
- GPS Data (if available)
- ⚠️ Suspicious Indicators (editing software detection)

### 5. Channel Analysis

Splits the image into individual **R, G, B, Luminance, Hue, or Saturation** channels. Channel inconsistencies can reveal regions where colors were artificially altered.

| Parameter | Options | Description |
|-----------|---------|-------------|
| Channel | R / G / B / Luminance / Hue / Saturation | Channel to extract |
| Color Mode | On/Off | Display in representative color or grayscale |

### 6. Edge & Gradient Detection

Applies **convolution-based edge operators** to reveal boundaries. Editing artifacts often produce unnatural edge patterns at tampering boundaries.

| Operator | Kernel Size | Best For |
|----------|-------------|----------|
| **Sobel** | 3×3 | General edge detection |
| **Prewitt** | 3×3 | Uniform edge response |
| **Scharr** | 3×3 | More accurate than Sobel |
| **Roberts** | 2×2 | Diagonal edges |
| **Laplacian** | 3×3 | Second-order edges, blob detection |

## 📚 DIP Concepts Covered

This project demonstrates the following **Digital Image Processing** concepts:

| Concept | Used In |
|---------|---------|
| JPEG Compression & DCT | ELA |
| Gaussian Filtering (Separable Convolution) | Noise Analysis |
| Block Matching & Feature Extraction | Copy-Move Detection |
| JPEG/TIFF/EXIF Binary Parsing | Metadata Extraction |
| Color Space Conversion (RGB ↔ HSL) | Channel Analysis |
| 2D Convolution | Edge Detection |
| Gradient Operators (Sobel, Prewitt, Scharr, Roberts) | Edge Detection |
| Laplacian (Second-Order Derivative) | Edge Detection |
| Image Thresholding | Edge Detection |
| Histogram Computation | Live Histogram |
| BT.601 Luminance | Channel Analysis, Edge Detection |
| Image Normalization | All tools |

## 📁 Project Structure

```
image-forensics-toolkit/
├── index.html              # Main application page
├── css/
│   └── style.css           # Dark glassmorphism design system
├── js/
│   ├── app.js              # Main controller (upload, tabs, histogram, export)
│   ├── ela.js              # Error Level Analysis engine
│   ├── noise.js            # Noise pattern analysis (Gaussian blur)
│   ├── copymove.js         # Copy-move forgery detection (block matching)
│   ├── metadata.js         # EXIF metadata parser (raw byte parsing)
│   ├── channels.js         # RGB/HSL channel splitting
│   └── edges.js            # Edge detection (Sobel, Laplacian, etc.)
├── README.md
├── LICENSE
├── CONTRIBUTING.md
└── .gitignore
```

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Structure** | HTML5 |
| **Styling** | Vanilla CSS (Custom Properties, Glassmorphism) |
| **Logic** | Vanilla JavaScript (ES6+) |
| **Image Processing** | Canvas API, ImageData |
| **Typography** | [Inter](https://fonts.google.com/specimen/Inter), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) |
| **Icons** | [Font Awesome 6](https://fontawesome.com/) |

**Zero dependencies. Zero build tools. Zero server requirement.**

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Some ideas for contributions:
- [ ] Add Principal Component Analysis (PCA) tool
- [ ] Implement DCT block visualization
- [ ] Add image comparison (overlay two images)
- [ ] Implement JPEG ghost detection
- [ ] Add batch processing support
- [ ] Improve copy-move detection with DCT-based features
- [ ] Add dark/light theme toggle

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- DIP algorithms based on standard image processing literature (Gonzalez & Woods)
- Edge detection kernels: Sobel, Prewitt, Roberts, Scharr, Laplacian operators
- ELA technique inspired by [FotoForensics](https://fotoforensics.com/)
- BT.601 luminance standard for grayscale conversion

---

<div align="center">

**Built for Digital Image Processing Lab** · Made with ❤️

</div>
