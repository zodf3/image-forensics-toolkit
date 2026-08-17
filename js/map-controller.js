/* ═══════════════════════════════════════════════
   📐 DIP: LEAFLET MAP CONTROLLER
   Handles initialization and GPS coordinate
   visualization using the Leaflet.js library.
   This module renders geospatial data extracted
   from EXIF metadata onto an interactive map.
   ═══════════════════════════════════════════════ */

window.MapController = (function () {
    'use strict';

    let map = null;
    let marker = null;
    let circle = null;

    return {

        /**
         * Initialize the Leaflet map in the given container.
         * Uses CartoDB Dark Matter tiles for a dark-themed map
         * that matches our UI without needing CSS filter hacks.
         */
        init: function (containerId) {
            if (map) {
                map.remove();
                map = null;
            }

            map = L.map(containerId, {
                center: [20, 0],
                zoom: 2,
                zoomControl: true,
                attributionControl: true
            });

            /* ═══════════════════════════════════════════════
               Using CartoDB Dark Matter tiles — a naturally
               dark tile set that doesn't require CSS filter
               inversion. This avoids the common Leaflet dark
               mode issue where filters break marker rendering.
               ═══════════════════════════════════════════════ */
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(map);

            // Fix tile rendering in initially hidden containers
            setTimeout(function () {
                if (map) map.invalidateSize();
            }, 300);
        },

        /**
         * Plot a GPS coordinate on the map.
         * Drops a glowing red marker and draws a danger radius.
         */
        plotLocation: function (lat, lng) {
            if (!map) return;

            // Clear previous markers
            if (marker) map.removeLayer(marker);
            if (circle) map.removeLayer(circle);

            var latLng = [lat, lng];

            // Custom red dot icon
            var icon = L.divIcon({
                className: 'gps-marker-icon',
                html: '<div style="width:14px;height:14px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(239,68,68,0.8);"></div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });

            marker = L.marker(latLng, { icon: icon }).addTo(map);

            // Danger radius circle (200m)
            circle = L.circle(latLng, {
                radius: 200,
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '6, 4'
            }).addTo(map);

            // Popup with coordinates
            marker.bindPopup(
                '<b style="color:#ef4444;">⚠ GPS Location Found</b><br>' +
                'Lat: ' + lat.toFixed(6) + '<br>' +
                'Lng: ' + lng.toFixed(6)
            ).openPopup();

            // Fly to location smoothly
            map.flyTo(latLng, 15, { duration: 2.0 });
        },

        /**
         * Reset the map to its default state.
         */
        reset: function () {
            if (!map) return;
            if (marker) { map.removeLayer(marker); marker = null; }
            if (circle) { map.removeLayer(circle); circle = null; }
            map.setView([20, 0], 2);
        },

        /**
         * Force map to recalculate its size.
         * Call this after the map's container becomes visible.
         */
        refresh: function () {
            if (map) {
                setTimeout(function () { map.invalidateSize(); }, 200);
            }
        }
    };
})();
