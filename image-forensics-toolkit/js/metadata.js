/**
 * EXIF Metadata Extraction Module
 * 
 * Parses JPEG EXIF data from raw file bytes to extract camera info, 
 * timestamps, software used, etc. Displays results as HTML.
 */

window.extractMetadata = function(file, outputElement) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const buffer = e.target.result;
                const view = new DataView(buffer);
                const metadata = {
                    fileInfo: {
                        Name: file.name,
                        Size: formatBytes(file.size),
                        Type: file.type,
                        LastModified: new Date(file.lastModified).toLocaleString()
                    },
                    cameraInfo: {},
                    exifDetails: {},
                    gpsData: {},
                    flags: []
                };

                // Check for valid JPEG SOI (Start of Image) marker
                if (view.getUint16(0, false) !== 0xFFD8) {
                    throw new Error("Not a valid JPEG image.");
                }

                let offset = 2;
                let exifOffset = -1;
                
                // Scan for APP1 marker
                while (offset < view.byteLength) {
                    const marker = view.getUint16(offset, false);
                    const length = view.getUint16(offset + 2, false);
                    
                    if (marker === 0xFFE1) {
                        // Check if it's EXIF
                        const identifier = view.getUint32(offset + 4, false);
                        if (identifier === 0x45786966) { // "Exif"
                            exifOffset = offset + 10;
                            break;
                        }
                    }
                    offset += 2 + length;
                }

                if (exifOffset !== -1) {
                    // Parse TIFF header
                    const byteOrder = view.getUint16(exifOffset, false);
                    const littleEndian = (byteOrder === 0x4949); // "II"
                    
                    const tiffOffset = exifOffset;
                    const firstIfdOffset = view.getUint32(exifOffset + 4, littleEndian);
                    
                    // Parse IFD0
                    const ifd0 = parseIFD(view, tiffOffset + firstIfdOffset, tiffOffset, littleEndian);
                    
                    // Map common IFD0 tags
                    if (ifd0[0x010F]) metadata.cameraInfo.Make = getString(view, ifd0[0x010F].valOffset, ifd0[0x010F].count);
                    if (ifd0[0x0110]) metadata.cameraInfo.Model = getString(view, ifd0[0x0110].valOffset, ifd0[0x0110].count);
                    if (ifd0[0x0131]) metadata.cameraInfo.Software = getString(view, ifd0[0x0131].valOffset, ifd0[0x0131].count);
                    
                    // Check for suspicious software
                    if (metadata.cameraInfo.Software) {
                        const sw = metadata.cameraInfo.Software.toLowerCase();
                        if (sw.includes('photoshop') || sw.includes('gimp') || sw.includes('lightroom')) {
                            metadata.flags.push("Suspicious software detected: " + metadata.cameraInfo.Software);
                        }
                    }

                    // Parse ExifIFD
                    if (ifd0[0x8769]) {
                        const exifIfdOffset = ifd0[0x8769].value;
                        const exifIfd = parseIFD(view, tiffOffset + exifIfdOffset, tiffOffset, littleEndian);
                        
                        if (exifIfd[0x829A]) metadata.exifDetails.ExposureTime = getRational(view, exifIfd[0x829A].valOffset, littleEndian) + " s";
                        if (exifIfd[0x829D]) metadata.exifDetails.FNumber = "f/" + getRational(view, exifIfd[0x829D].valOffset, littleEndian);
                        if (exifIfd[0x8827]) metadata.exifDetails.ISOSpeed = getShortOrLong(view, exifIfd[0x8827], littleEndian);
                        if (exifIfd[0x920A]) metadata.exifDetails.FocalLength = getRational(view, exifIfd[0x920A].valOffset, littleEndian) + " mm";
                    }
                    
                    // Parse GPS IFD
                    if (ifd0[0x8825]) {
                         const gpsIfdOffset = ifd0[0x8825].value;
                         const gpsIfd = parseIFD(view, tiffOffset + gpsIfdOffset, tiffOffset, littleEndian);
                         if(gpsIfd[0x0001]) metadata.gpsData.GPSLatitudeRef = getString(view, gpsIfd[0x0001].valOffset, gpsIfd[0x0001].count);
                         metadata.gpsData.Presence = "GPS Data Found";
                    }
                } else {
                    metadata.flags.push("No EXIF data found.");
                }

                renderMetadata(metadata, outputElement);
                resolve(metadata);

            } catch (err) {
                reject(err);
            }
        };
        
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsArrayBuffer(file);
    });
};

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function parseIFD(view, offset, tiffOffset, littleEndian) {
    const entries = view.getUint16(offset, littleEndian);
    const ifd = {};
    
    for (let i = 0; i < entries; i++) {
        const entryOffset = offset + 2 + (i * 12);
        const tag = view.getUint16(entryOffset, littleEndian);
        const type = view.getUint16(entryOffset + 2, littleEndian);
        const count = view.getUint32(entryOffset + 4, littleEndian);
        let valueOffset = entryOffset + 8;
        
        // If data is larger than 4 bytes, the value field is an offset
        const byteCount = getByteCount(type, count);
        let value = null;
        
        if (byteCount > 4) {
            valueOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
        } else if (type === 3) {
            value = view.getUint16(entryOffset + 8, littleEndian);
        } else if (type === 4) {
            value = view.getUint32(entryOffset + 8, littleEndian);
        }
        
        ifd[tag] = { type, count, valOffset: valueOffset, value };
    }
    return ifd;
}

function getByteCount(type, count) {
    switch (type) {
        case 1: case 2: case 6: case 7: return count;
        case 3: case 8: return count * 2;
        case 4: case 9: return count * 4;
        case 5: case 10: return count * 8;
        default: return 0;
    }
}

function getString(view, offset, length) {
    let str = '';
    for (let i = 0; i < length - 1; i++) { // -1 to skip null terminator
        const code = view.getUint8(offset + i);
        if (code === 0) break;
        str += String.fromCharCode(code);
    }
    return str;
}

function getRational(view, offset, littleEndian) {
    const num = view.getUint32(offset, littleEndian);
    const den = view.getUint32(offset + 4, littleEndian);
    if (den === 0) return 0;
    return (num / den).toFixed(2);
}

function getShortOrLong(view, entry, littleEndian) {
    if (entry.type === 3) {
        return view.getUint16(entry.valOffset, littleEndian);
    }
    return view.getUint32(entry.valOffset, littleEndian);
}

function renderMetadata(data, container) {
    let html = '';

    const createGroup = (title, obj) => {
        if (Object.keys(obj).length === 0) return '';
        let groupHtml = `<div class="meta-group"><div class="meta-group-title">${title}</div>`;
        for (const [key, val] of Object.entries(obj)) {
            groupHtml += `<div class="meta-row"><span class="meta-key">${key}:</span> <span class="meta-value">${val}</span></div>`;
        }
        groupHtml += '</div>';
        return groupHtml;
    };

    html += createGroup("File Information", data.fileInfo);
    html += createGroup("Camera Information", data.cameraInfo);
    html += createGroup("EXIF Details", data.exifDetails);
    html += createGroup("GPS Data", data.gpsData);

    if (data.flags && data.flags.length > 0) {
        html += `<div class="meta-group"><div class="meta-group-title" style="color:red;">Suspicious Indicators</div>`;
        data.flags.forEach(flag => {
            html += `<div class="meta-row"><span class="meta-flag" style="color:red; font-weight:bold;">${flag}</span></div>`;
        });
        html += '</div>';
    }

    container.innerHTML = html;
}
