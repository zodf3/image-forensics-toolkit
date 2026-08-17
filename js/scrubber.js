window.Scrubber = {
    scrubImage: function(file) {
        return new Promise((resolve, reject) => {
            /* ═══════════════════════════════════════════════
               📐 DIP: IMAGE RECONSTRUCTION VIA CANVAS
               Load the image into an HTMLImageElement
               ═══════════════════════════════════════════════ */
            const img = new Image();
            const url = URL.createObjectURL(file);
            
            img.onload = () => {
                URL.revokeObjectURL(url);
                
                /* ═══════════════════════════════════════════════
                   📐 DIP: PIXEL DATA EXTRACTION / RASTERIZATION
                   Draw the image onto an invisible canvas. This rasterization 
                   step naturally strips all non-pixel data (EXIF, ICC profiles, etc.)
                   ═══════════════════════════════════════════════ */
                const canvas = document.createElement('canvas');
                canvas.id = 'scrub-canvas';
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                /* ═══════════════════════════════════════════════
                   📐 DIP: IMAGE ENCODING / LOSSY COMPRESSION
                   Export the canvas as a JPEG blob at 95% quality via canvas.toBlob()
                   ═══════════════════════════════════════════════ */
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Canvas toBlob failed"));
                    }
                }, 'image/jpeg', 0.95);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Failed to load image"));
            };
            
            img.src = url;
        });
    }
};
