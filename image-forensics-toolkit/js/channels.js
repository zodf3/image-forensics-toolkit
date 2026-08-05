/**
 * Channel Analysis Module
 * 
 * Splits an image into individual color channels (R, G, B, Luminance, Hue, Saturation)
 * for forensic inspection. Channel inconsistencies can reveal manipulation.
 */

// Helper: Convert RGB to HSL
// r, g, b in [0, 255]
// returns [h, s, l] with h in [0, 360], s in [0, 1], l in [0, 1]
function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s, l];
}

// Helper: Convert HSL to RGB
// h in [0, 360], s, l in [0, 1]
// returns [r, g, b] in [0, 255]
function hslToRgb(h, s, l) {
    let r, g, b;
    h /= 360;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = function(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

window.performChannelAnalysis = function(sourceCanvas, resultCanvas, options) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    
    // Ensure result canvas dimensions match source
    resultCanvas.width = width;
    resultCanvas.height = height;

    const ctxSource = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const ctxResult = resultCanvas.getContext('2d');

    const sourceData = ctxSource.getImageData(0, 0, width, height);
    const resultData = ctxResult.createImageData(width, height);

    const channel = options.channel || 'luminance';
    const showInColor = options.showInColor === true;

    for (let i = 0; i < sourceData.data.length; i += 4) {
        const r = sourceData.data[i];
        const g = sourceData.data[i + 1];
        const b = sourceData.data[i + 2];
        const a = sourceData.data[i + 3];

        let outR = 0, outG = 0, outB = 0;
        let value = 0;

        switch (channel) {
            case 'red':
                value = r;
                if (showInColor) {
                    outR = value;
                } else {
                    outR = outG = outB = value;
                }
                break;
            case 'green':
                value = g;
                if (showInColor) {
                    outG = value;
                } else {
                    outR = outG = outB = value;
                }
                break;
            case 'blue':
                value = b;
                if (showInColor) {
                    outB = value;
                } else {
                    outR = outG = outB = value;
                }
                break;
            case 'luminance':
                // Compute BT.601 luminance
                value = 0.299 * r + 0.587 * g + 0.114 * b;
                outR = outG = outB = value;
                break;
            case 'hue': {
                const hsl = rgbToHsl(r, g, b);
                value = (hsl[0] / 360) * 255;
                if (showInColor) {
                    // Display hue by creating a full-saturation color from the hue angle
                    const rgb = hslToRgb(hsl[0], 1.0, 0.5);
                    outR = rgb[0];
                    outG = rgb[1];
                    outB = rgb[2];
                } else {
                    outR = outG = outB = value;
                }
                break;
            }
            case 'saturation': {
                const hsl = rgbToHsl(r, g, b);
                value = hsl[1] * 255;
                if (showInColor) {
                    // Cyan-to-white gradient: Sat 0 -> White, Sat 1 -> Cyan
                    outR = 255 - value;
                    outG = 255;
                    outB = 255;
                } else {
                    outR = outG = outB = value;
                }
                break;
            }
            default:
                outR = r; outG = g; outB = b;
                break;
        }

        resultData.data[i] = outR;
        resultData.data[i + 1] = outG;
        resultData.data[i + 2] = outB;
        resultData.data[i + 3] = a; // Preserve original alpha
    }

    ctxResult.putImageData(resultData, 0, 0);
};
