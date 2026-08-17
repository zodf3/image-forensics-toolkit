/* ═══════════════════════════════════════════════
   📐 DIP: RGB TO HSL COLOR SPACE CONVERSION
   Converts RGB values to HSL color space.
   ═══════════════════════════════════════════════ */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

/* ═══════════════════════════════════════════════
   📐 DIP: HSL TO RGB COLOR SPACE CONVERSION
   Converts HSL values back to RGB color space.
   ═══════════════════════════════════════════════ */
function hslToRgb(h, s, l) {
    var r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        var hue2rgb = function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

window.performChannelAnalysis = function(sourceCanvas, resultCanvas, options) {
    const ctx = sourceCanvas.getContext('2d');
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    
    resultCanvas.width = width;
    resultCanvas.height = height;
    const resultCtx = resultCanvas.getContext('2d');
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const resultImageData = resultCtx.createImageData(width, height);
    const resultData = resultImageData.data;
    
    const channel = options.channel || 'red';
    const showInColor = options.showInColor !== undefined ? options.showInColor : true;
    
    for (let i = 0; i < data.length; i += 4) {
        /* ═══════════════════════════════════════════════
           📐 DIP: COLOR CHANNEL DECOMPOSITION
           Extract the selected channel value from each pixel
           ═══════════════════════════════════════════════ */
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];
        let a = data[i+3];
        
        let outR = 0, outG = 0, outB = 0;
        
        if (channel === 'red') {
            let val = r;
            /* ═══════════════════════════════════════════════
               📐 DIP: PSEUDOCOLOR RENDERING
               Display channel in its representative color
               ═══════════════════════════════════════════════ */
            if (showInColor) { outR = val; } else { outR = outG = outB = val; }
        } else if (channel === 'green') {
            let val = g;
            if (showInColor) { outG = val; } else { outR = outG = outB = val; }
        } else if (channel === 'blue') {
            let val = b;
            if (showInColor) { outB = val; } else { outR = outG = outB = val; }
        } else if (channel === 'luminance') {
            /* ═══════════════════════════════════════════════
               📐 DIP: BT.601 LUMINANCE
               For luminance: Y = 0.299R + 0.587G + 0.114B
               ═══════════════════════════════════════════════ */
            let y = 0.299 * r + 0.587 * g + 0.114 * b;
            outR = outG = outB = y;
        } else if (channel === 'hue' || channel === 'saturation') {
            /* ═══════════════════════════════════════════════
               📐 DIP: RGB TO HSL COLOR SPACE CONVERSION
               For hue/saturation: Convert RGB to HSL
               ═══════════════════════════════════════════════ */
            let hsl = rgbToHsl(r, g, b);
            if (channel === 'hue') {
                let h = hsl[0];
                if (showInColor) {
                    let rgb = hslToRgb(h, 1, 0.5);
                    outR = rgb[0]; outG = rgb[1]; outB = rgb[2];
                } else {
                    outR = outG = outB = h * 255;
                }
            } else if (channel === 'saturation') {
                let s = hsl[1];
                if (showInColor) {
                    let rgb = hslToRgb(hsl[0], s, 0.5);
                    outR = rgb[0]; outG = rgb[1]; outB = rgb[2];
                } else {
                    outR = outG = outB = s * 255;
                }
            }
        }
        
        resultData[i] = outR;
        resultData[i+1] = outG;
        resultData[i+2] = outB;
        resultData[i+3] = a;
    }
    
    resultCtx.putImageData(resultImageData, 0, 0);
};
