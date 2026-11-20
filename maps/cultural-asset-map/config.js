// ============================================================
// ELMHURST & JACKSON HEIGHTS CULTURAL ASSET MAP
// ============================================================
//
// Files for this map:
//   content.js  - panel text and walk names (edit words there)
//   config.js   - THIS FILE: map settings + map behavior
//   panel.js    - side panel / bottom sheet, list, info cards
//   panel.css   - panel styles
//
// Part 1 (mapConfig) works like every other map's config.js.
//
// Part 2 (MAP-SPECIFIC EXTRAS, bottom of this file) adds features
// the shared map.js does not have, for THIS map only:
//   - category shapes: filled for Primary Stops, outline for
//     Secondary Stops, plus a "×2" badge for multi-walk assets
//   - walk + category filtering (non-matching stops fade)
//   - optional districts and corridors layers
//   - hover grow, selected-point ring, fit to points
//   - zoom limits and a lighter, gray version of the basemap
// It exposes a small "window.camMap" toolkit used by panel.js.
// Nothing in /shared is changed.
// ============================================================

(function () {

    // ========================================================
    // SETTINGS — edit these to restyle the map
    // ========================================================

    const DATA_FILE = "./data/cultural-assets.geojson";

    // One entry per Category value (must match the data exactly).
    // "key" is a short internal name used for symbol images.
    const CATEGORIES = [
        { value: "Culture & Heritage", key: "culture",      color: "#23418A", shape: "cross" },
        { value: "Institutions",       key: "institutions", color: "#F15F22", shape: "triangle" },
        { value: "Public Space",       key: "publicspace",  color: "#73BB44", shape: "circle" },
        { value: "Local Economy",      key: "economy",      color: "#589BD4", shape: "square" }
    ];

    const SYMBOL = {
        // Primary Stop: filled shape with a white halo
        primarySize: 22,
        primaryHalo: 2,

        // Secondary Stop: smaller, outline only (thin white halo
        // underneath so light colors stay visible)
        secondarySize: 15,
        secondaryStroke: 2.25,
        secondaryHalo: 1,

        // Opacity of stops that are not on the selected walk
        fadedOpacity: 0.2,

        // Badge for assets seen on 2+ walks ("×2")
        badgeColor: "#2E2B29",
        badgeTextColor: "#ffffff",

        // Hover effect: how much larger a symbol grows, and how
        // long the grow takes (ms)
        hoverScale: 1.3,
        hoverDuration: 120,

        // Ring drawn around the selected point
        selectedRingColor: "#2E2B29"
    };

    // Optional areas. Set a file path to turn a layer on, e.g.
    // districtsFile: "./data/districts.geojson"
    // Each feature should have "Name" and (optionally) "Description".
    const AREAS = {
        districtsFile: null,     // polygons
        corridorsFile: null,     // lines
        color: "#615D59",
        districtFillOpacity: 0.1,
        corridorWidth: 8,
        corridorOpacity: 0.25,
        visibleOnLoad: true
    };

    // Walking routes and the IBX line (all drawn under the points).
    const ROUTES = {
        // One line file per walk; the number matches the data's
        // Walks field (1 = Walk A, 2 = Walk B, ...).
        walkFiles: {
            1: "./data/walk-1.geojson",
            2: "./data/walk-2.geojson",
            3: "./data/walk-3.geojson",
            4: "./data/walk-4.geojson",
            5: "./data/walk-5.geojson"
        },
        walkColor: "#000000",        // selected walk's route
        walkWidth: 3.5,
        walkCasing: "#ffffff",       // white edge so it reads over streets
        walkAllColor: "#615D59",     // all routes, when "All" is selected
        walkAllWidth: 2,
        walkAllOpacity: 0.45,

        ibxFile: "./data/ibx-corridor.geojson",
        ibxStationsFile: "./data/ibx-stations.geojson",
        ibxColor: "#FFCA09",         // MAS yellow
        ibxCasing: null,             // edge color around the line (null = none)
        ibxStationRadius: 6.5,       // a bit wider than the line so stops read
        ibxStationStroke: 0,         // station outline width (0 = none)
        ibxStationStrokeColor: "#2E2B29",
        ibxWidth: 4,
        ibxStationLabelsMinZoom: 13.5
    };

    // Basemap look (this map only).
    const BASEMAP = {
        grayscale: true,      // remove color (parks, water, etc.)
        lighten: 0.3,         // 0 = unchanged, 1 = white
        lightenLabels: 0.15,  // labels lightened less so they stay readable
        hidePools: true,      // hide backyard swimming pools (read as stray dots)

        // Building footprints
        buildingsMinZoom: 16,          // appear from this zoom in
                                       // (~14 = neighborhood, ~16 = a block or two)
        buildingFill: "#e6e6e6",       // footprint color
        buildingStroke: "#ffffff",     // outline color
        buildingStrokeWidth: 0.75      // outline thickness (px)
    };

    // Zoom limits: zoomed out no further than all of NYC,
    // zoomed in no further than building level.
    const NYC_BOUNDS = [[-74.2591, 40.4774], [-73.7004, 40.9176]];
    const PAN_MARGIN = { lon: 0.6, lat: 0.35 };   // how far past NYC you can pan
    const MAX_ZOOM = 18;
    const FIT_MAX_ZOOM = 16.5;

    // Walk numbers in the data -> letters (from content.js)
    const WALKS = ((window.CAM_CONTENT && window.CAM_CONTENT.walks) || []);


    // ========================================================
    // PART 1: STANDARD MAP CONFIG
    // ========================================================

    const LAYER_ID = "cultural_assets";
    const HIT_LAYER_ID = "cultural_assets_hit";
    const FOCUS_LAYER_ID = "cultural_assets_focus";
    const BADGE_LAYER_ID = "cultural_assets_badge";
    const RING_LAYER_ID = "cultural_assets_selected";
    const SOURCE_ID = `${LAYER_ID}_source`;   // name map.js gives the data source
    const ID_FIELD = "OBJECTID";              // unique id per point

    const isSecondary = ["==", ["get", "Type"], "Secondary Stop"];

    // Picks the symbol image for each point, e.g. "cam-culture-p"
    // (p = primary / filled, s = secondary / outline).
    const iconExpression = [
        "concat",
        "cam-",
        ["match", ["get", "Category"],
            ...CATEGORIES.flatMap((c) => [c.value, c.key]),
            "other"
        ],
        ["case", isSecondary, "-s", "-p"]
    ];

    window.mapConfig = {

        // Fallback view; replaced by "fit to points" once data loads.
        center: [-73.8858, 40.7465],
        zoom: 14.5,

        // No floating legend: the legend lives in the side panel
        // (panel.js), and info cards replace pop-ups.

        layers: [

            // 1. INVISIBLE TAP TARGETS
            // Larger, transparent circles under each symbol so
            // small points are easy to click / tap on phones.
            {
                id: HIT_LAYER_ID,
                sourceId: LAYER_ID,
                name: "Cultural Assets (tap targets)",
                file: DATA_FILE,
                type: "circle",
                interactive: true,

                style: {
                    color: "rgba(0, 0, 0, 0)",
                    radius: 16
                }
            },

            // 2. CATEGORY SYMBOLS
            {
                id: LAYER_ID,
                sourceId: LAYER_ID,
                name: "Cultural Assets",
                file: DATA_FILE,
                type: "symbol",
                interactive: false,

                style: {
                    icon: iconExpression,
                    iconSize: 1
                }
            }
        ]
    };


    // ========================================================
    // PART 2: MAP-SPECIFIC EXTRAS
    // Runs after shared/js/map.js has created the map.
    // ========================================================

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");


    // ----------------------------------------------------
    // SYMBOL DRAWING
    // ----------------------------------------------------

    // Traces a shape whose outer size is "size", centered on (c, c).
    function traceShape(ctx, shape, c, size) {

        ctx.beginPath();

        if (shape === "cross") {
            // Plus sign as one outline; arm thickness is a fixed
            // share of the size so every size has the same look.
            const h = size / 2;
            const t = size * 0.17;
            ctx.moveTo(c - t, c - h);
            ctx.lineTo(c + t, c - h);
            ctx.lineTo(c + t, c - t);
            ctx.lineTo(c + h, c - t);
            ctx.lineTo(c + h, c + t);
            ctx.lineTo(c + t, c + t);
            ctx.lineTo(c + t, c + h);
            ctx.lineTo(c - t, c + h);
            ctx.lineTo(c - t, c + t);
            ctx.lineTo(c - h, c + t);
            ctx.lineTo(c - h, c - t);
            ctx.lineTo(c - t, c - t);
            ctx.closePath();
        }
        else if (shape === "triangle") {
            // Equilateral, point up, nudged down to look centered
            const height = size * Math.sqrt(3) / 2;
            const top = c - height / 2 - size * 0.04;
            ctx.moveTo(c, top);
            ctx.lineTo(c + size / 2, top + height);
            ctx.lineTo(c - size / 2, top + height);
            ctx.closePath();
        }
        else if (shape === "square") {
            // Slightly smaller than "size" so it balances the circle
            const half = size * 0.44;
            ctx.rect(c - half, c - half, half * 2, half * 2);
        }
        else {
            ctx.arc(c, c, size / 2, 0, Math.PI * 2);
        }
    }

    // Draws one symbol on a canvas.
    //   style "filled":  solid shape with a white halo (Primary Stop)
    //   style "outline": colored outline, transparent inside
    //                    (Secondary Stop)
    function drawSymbol(shape, color, style, ratio, scale) {

        ratio = ratio || 2;
        scale = scale || 1;

        const filled = style !== "outline";
        const size = (filled ? SYMBOL.primarySize : SYMBOL.secondarySize) * scale;
        const halo = (filled ? SYMBOL.primaryHalo : SYMBOL.secondaryHalo) * scale;
        const stroke = SYMBOL.secondaryStroke * scale;

        const pad = halo * 2 + 2;          // room for sharp halo corners
        const box = size + pad * 2;

        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = Math.ceil(box * ratio);

        const ctx = canvas.getContext("2d");
        ctx.scale(ratio, ratio);
        ctx.lineJoin = "miter";
        ctx.miterLimit = 10;

        const c = box / 2;

        if (filled) {
            traceShape(ctx, shape, c, size);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = halo * 2;
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.fill();
        } else {
            // Shrink the path so the outline stays inside "size"
            const inset = shape === "triangle" ? stroke * Math.sqrt(3) : stroke;
            traceShape(ctx, shape, c, size - inset);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = stroke + halo * 2;
            ctx.stroke();
            ctx.strokeStyle = color;
            ctx.lineWidth = stroke;
            ctx.stroke();
        }

        canvas.style.width = canvas.style.height = `${box}px`;
        return canvas;
    }

    // "×2" badge for assets on 2+ walks.
    function drawBadge(count, ratio) {

        const text = `×${count}`;
        const font = `700 10px "Libre Franklin", Arial, sans-serif`;

        const measure = document.createElement("canvas").getContext("2d");
        measure.font = font;
        const textWidth = measure.measureText(text).width;

        const h = 15;
        const w = Math.max(h, Math.ceil(textWidth + 9));
        const border = 1.5;
        const boxW = w + border * 2;
        const boxH = h + border * 2;

        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(boxW * ratio);
        canvas.height = Math.ceil(boxH * ratio);

        const ctx = canvas.getContext("2d");
        ctx.scale(ratio, ratio);

        const r = h / 2;
        ctx.beginPath();
        ctx.moveTo(border + r, border);
        ctx.lineTo(border + w - r, border);
        ctx.arc(border + w - r, border + r, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(border + r, border + h);
        ctx.arc(border + r, border + r, r, Math.PI / 2, Math.PI * 1.5);
        ctx.closePath();
        ctx.fillStyle = SYMBOL.badgeColor;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = border;
        ctx.stroke();

        ctx.font = font;
        ctx.fillStyle = SYMBOL.badgeTextColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, boxW / 2, boxH / 2 + 0.5);

        return canvas;
    }

    function addCanvasImage(map, id, canvas, ratio) {
        if (map.hasImage(id)) {
            return;
        }
        const image = canvas
            .getContext("2d")
            .getImageData(0, 0, canvas.width, canvas.height);
        map.addImage(id, image, { pixelRatio: ratio });
    }


    // ----------------------------------------------------
    // BASEMAP: GRAY + LIGHTER
    // Rewrites the colors in this page's copy of the basemap
    // style. Other maps are not affected.
    // ----------------------------------------------------

    function parseColor(text) {

        let m = /^#([0-9a-f]{3,8})$/i.exec(text);
        if (m) {
            let hex = m[1];
            if (hex.length <= 4) {
                hex = hex.split("").map((ch) => ch + ch).join("");
            }
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
                a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
            };
        }

        m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(text);
        if (m) {
            return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
        }

        m = /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(text);
        if (m) {
            const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
            const f = (n) => {
                const k = (n + h * 12) % 12;
                const a = s * Math.min(l, 1 - l);
                return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
            };
            return { r: f(0), g: f(8), b: f(4), a: m[4] === undefined ? 1 : +m[4] };
        }

        return null;
    }

    function adjustColor(text, lighten) {

        const col = parseColor(text);
        if (!col) {
            return text;
        }

        let { r, g, b } = col;

        if (BASEMAP.grayscale) {
            r = g = b = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        r += (255 - r) * lighten;
        g += (255 - g) * lighten;
        b += (255 - b) * lighten;

        return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${col.a})`;
    }

    // Walks through a paint value (plain color or expression)
    // and adjusts every color string in it.
    function adjustValue(value, lighten) {
        if (typeof value === "string") {
            return adjustColor(value, lighten);
        }
        if (Array.isArray(value)) {
            return value.map((v) => adjustValue(v, lighten));
        }
        if (value && typeof value === "object" && Array.isArray(value.stops)) {
            return {
                ...value,
                stops: value.stops.map(([z, v]) => [z, adjustValue(v, lighten)])
            };
        }
        return value;
    }

    function restyleBasemap(map) {

        map.getStyle().layers.forEach((layer) => {

            if (layer.id.startsWith(LAYER_ID) || layer.id.startsWith("cam_")) {
                return;   // leave our own layers alone
            }

            // Building footprints: only when zoomed in
            if (layer["source-layer"] === "building") {
                map.setLayerZoomRange(
                    layer.id,
                    Math.max(BASEMAP.buildingsMinZoom, layer.minzoom || 0),
                    layer.maxzoom ?? 24
                );
            }

            // Swimming pools: make them invisible (rivers, lakes etc. stay)
            if (BASEMAP.hidePools && layer["source-layer"] === "water" && layer.type === "fill") {
                const opacity = (layer.paint && layer.paint["fill-opacity"]) ?? 1;
                map.setPaintProperty(layer.id, "fill-opacity", [
                    "case",
                    ["==", ["get", "class"], "swimming_pool"], 0,
                    typeof opacity === "number" ? opacity : 1
                ]);
            }

            if (layer.type === "raster" && BASEMAP.grayscale) {
                map.setPaintProperty(layer.id, "raster-saturation", -1);
            }

            const paint = layer.paint || {};

            Object.keys(paint).forEach((prop) => {

                if (!prop.endsWith("-color")) {
                    return;
                }

                const lighten = prop.startsWith("text-")
                    ? BASEMAP.lightenLabels
                    : BASEMAP.lighten;

                try {
                    map.setPaintProperty(
                        layer.id,
                        prop,
                        adjustValue(paint[prop], lighten)
                    );
                } catch (error) {
                    // Skip anything the style doesn't accept
                }
            });
        });

        styleBuildings(map);
    }

    // Building footprints: set fill color and add a white outline
    // (only from BASEMAP.buildingsMinZoom in).
    function styleBuildings(map) {

        const layers = map.getStyle().layers;

        const buildingLayers = layers.filter(
            (l) => l["source-layer"] === "building" && l.type === "fill"
        );

        buildingLayers.forEach((layer) => {

            map.setPaintProperty(layer.id, "fill-color", BASEMAP.buildingFill);
            map.setPaintProperty(layer.id, "fill-outline-color", BASEMAP.buildingStroke);

            const outlineId = `${layer.id}-cam-outline`;
            if (map.getLayer(outlineId)) {
                return;
            }

            // Put the outline directly above the footprint fill
            const index = layers.findIndex((l) => l.id === layer.id);
            const next = layers[index + 1];

            map.addLayer({
                id: outlineId,
                type: "line",
                source: layer.source,
                "source-layer": "building",
                minzoom: BASEMAP.buildingsMinZoom,
                paint: {
                    "line-color": BASEMAP.buildingStroke,
                    "line-width": BASEMAP.buildingStrokeWidth
                }
            }, next ? next.id : undefined);
        });
    }

    // Smallest zoom at which all of NYC still fills the screen.
    function updateMinZoom(map) {
        const camera = map.cameraForBounds(NYC_BOUNDS, { padding: 10 });
        if (camera && isFinite(camera.zoom)) {
            map.setMinZoom(Math.max(camera.zoom, 0));
        }
    }


    // ----------------------------------------------------
    // DATA: walk numbers -> letters, ids for each point
    // ----------------------------------------------------

    function walkLetter(number) {
        const walk = WALKS.find((w) => String(w.number) === String(number));
        return walk ? walk.letter : String(number);
    }

    function prepareData(geojson) {

        const assets = [];

        geojson.features.forEach((f) => {

            const p = f.properties || {};
            const id = Number(p[ID_FIELD]);

            const letters = String(p.Walks ?? "")
                .split(",")
                .map((w) => w.trim())
                .filter((w) => w !== "")
                .map(walkLetter);

            f.id = id;                       // lets the map track each point
            p.WalkLetters = letters.join(" · ");

            assets.push({
                id: id,
                name: p.Name || "(Unnamed)",
                category: p.Category,
                type: p.Type,
                walks: letters,
                coordinates: f.geometry && f.geometry.coordinates,
                properties: p
            });
        });

        return assets;
    }


    // ----------------------------------------------------
    // TOOLKIT FOR panel.js
    // ----------------------------------------------------

    const listeners = {};
    let resolveReady;

    const camMap = {
        categories: CATEGORIES,
        walks: WALKS,
        symbol: SYMBOL,
        areaSettings: AREAS,
        drawSymbol: drawSymbol,
        drawBadge: drawBadge,
        ready: new Promise((resolve) => { resolveReady = resolve; }),

        // panel.js replaces this so fits leave room for the panel
        getViewPadding: () => ({ top: 50, right: 50, bottom: 50, left: 50 }),

        on(event, callback) {
            (listeners[event] = listeners[event] || []).push(callback);
        }
    };

    function emit(event, value) {
        (listeners[event] || []).forEach((cb) => cb(value));
    }

    window.camMap = camMap;


    document.addEventListener("DOMContentLoaded", () => {

        // "map" is created by shared/js/map.js
        if (typeof map === "undefined") {
            return;
        }


        // ----------------------------------------------------
        // ZOOM + PAN LIMITS
        // ----------------------------------------------------

        map.setMaxZoom(MAX_ZOOM);
        map.setMaxBounds([
            [NYC_BOUNDS[0][0] - PAN_MARGIN.lon, NYC_BOUNDS[0][1] - PAN_MARGIN.lat],
            [NYC_BOUNDS[1][0] + PAN_MARGIN.lon, NYC_BOUNDS[1][1] + PAN_MARGIN.lat]
        ]);
        updateMinZoom(map);
        map.on("resize", () => updateMinZoom(map));


        // ----------------------------------------------------
        // BASEMAP RESTYLE (as soon as the basemap style arrives)
        // ----------------------------------------------------

        if (map.isStyleLoaded()) {
            restyleBasemap(map);
        } else {
            map.once("style.load", () => restyleBasemap(map));
        }


        // ----------------------------------------------------
        // SYMBOL IMAGES (created when the map first asks for one)
        // ----------------------------------------------------

        map.on("styleimagemissing", (e) => {

            const ratio = 4;   // extra resolution so symbols stay crisp

            const symbol = /^cam-([a-z]+)-([ps])$/.exec(e.id);
            if (symbol) {
                const category =
                    CATEGORIES.find((c) => c.key === symbol[1]) ||
                    { color: "#999999", shape: "circle" };
                addCanvasImage(
                    map,
                    e.id,
                    drawSymbol(
                        category.shape,
                        category.color,
                        symbol[2] === "s" ? "outline" : "filled",
                        ratio
                    ),
                    ratio
                );
                return;
            }

            const badge = /^cam-badge-(\d+)$/.exec(e.id);
            if (badge) {
                addCanvasImage(map, e.id, drawBadge(badge[1], ratio), ratio);
            }
        });


        // ----------------------------------------------------
        // AFTER LOAD
        // (map.js adds the source + layers in its own "load"
        //  step, which runs before this one)
        // ----------------------------------------------------

        map.on("load", () => {

            const FADE = SYMBOL.fadedOpacity;
            const lifted = ["boolean", ["feature-state", "lifted"], false];
            const dimmed = ["boolean", ["feature-state", "dim"], false];

            // Main symbols: hidden while "lifted" onto the focus
            // layer; faded when not on the selected walk.
            map.setLayoutProperty(LAYER_ID, "icon-ignore-placement", true);
            map.setLayoutProperty(LAYER_ID, "symbol-sort-key",
                ["case", isSecondary, 0, 1]);
            map.setPaintProperty(LAYER_ID, "icon-opacity",
                ["case", lifted, 0, dimmed, FADE, 1]);

            // Ring around the selected point (under the symbols)
            map.addLayer({
                id: RING_LAYER_ID,
                type: "circle",
                source: SOURCE_ID,
                filter: ["==", ["to-number", ["id"], -1], -1],
                paint: {
                    "circle-radius": 19,
                    "circle-color": "rgba(255, 255, 255, 0.85)",
                    "circle-stroke-color": SYMBOL.selectedRingColor,
                    "circle-stroke-width": 2
                }
            }, LAYER_ID);

            // Hovered / selected symbols, drawn larger on top
            map.addLayer({
                id: FOCUS_LAYER_ID,
                type: "symbol",
                source: SOURCE_ID,
                filter: ["in", ["to-number", ["id"], -1], ["literal", []]],
                layout: {
                    "icon-image": iconExpression,
                    "icon-size": SYMBOL.hoverScale,
                    "icon-allow-overlap": true,
                    "icon-ignore-placement": true
                },
                paint: {
                    "icon-opacity": ["case", dimmed, 0.6, 1]
                }
            });

            // Optional districts / corridors
            loadAreas(map);

            // Walking routes + IBX
            loadRoutes(map);

            // Data: add ids + walk letters, then hand to the panel
            fetch(DATA_FILE)
                .then((response) => response.json())
                .then((geojson) => {
                    state.assets = prepareData(geojson);
                    state.byId = new Map(state.assets.map((a) => [a.id, a]));

                    const source = map.getSource(SOURCE_ID);
                    if (source) {
                        source.setData(geojson);
                    }

                    // Badges need the UI font loaded first
                    const fontReady = document.fonts
                        ? document.fonts.load(`700 10px "Libre Franklin"`).catch(() => null)
                        : Promise.resolve();

                    return fontReady.then(() => {
                        addBadgeLayer(map, dimmed, FADE);
                        resolveReady({ assets: state.assets });
                    });
                })
                .catch((error) => console.error("Could not load point data:", error));

            setupPointerEvents(map);
        });


        // ----------------------------------------------------
        // FILTERING, HIGHLIGHTS, CAMERA
        // ----------------------------------------------------

        const state = {
            assets: [],
            byId: new Map(),
            categoryFilter: ["literal", CATEGORIES.map((c) => c.value)],
            hovered: null,       // under the mouse on the map
            highlighted: null,   // hovered / focused in the list
            selected: null,      // card open
            liftedIds: [],
            animation: null,
            walk: null,
            routeCoords: {}      // walk letter -> route coordinates
        };

        function categoryFilterExpression() {
            return ["in", ["get", "Category"], state.categoryFilter];
        }

        function addBadgeLayer(map, dimmed, fade) {
            map.addLayer({
                id: BADGE_LAYER_ID,
                type: "symbol",
                source: SOURCE_ID,
                filter: ["all",
                    [">=", ["to-number", ["get", "WalkCount"], 1], 2],
                    categoryFilterExpression()
                ],
                layout: {
                    "icon-image": ["concat", "cam-badge-",
                        ["to-string", ["to-number", ["get", "WalkCount"], 1]]],
                    "icon-offset": ["case", isSecondary, ["literal", [9, -9]], ["literal", [13, -12]]],
                    "icon-allow-overlap": true,
                    "icon-ignore-placement": true
                },
                paint: {
                    "icon-opacity": ["case", dimmed, fade, 1]
                }
            }, FOCUS_LAYER_ID);
        }

        // Applies walk + category filters.
        //   walk: a walk letter ("B") or null for all walks
        //   categories: list of Category values to show
        // Returns the ids that match both.
        camMap.applyFilters = function ({ walk, categories }) {

            state.categoryFilter = ["literal", categories];
            const filter = categoryFilterExpression();

            [LAYER_ID, HIT_LAYER_ID, FOCUS_LAYER_ID, RING_LAYER_ID].forEach((id) => {
                if (!map.getLayer(id)) {
                    return;
                }
                const base = id === FOCUS_LAYER_ID
                    ? ["in", ["to-number", ["id"], -1], ["literal", state.liftedIds]]
                    : id === RING_LAYER_ID
                        ? ["==", ["to-number", ["id"], -1], state.selected ?? -1]
                        : null;
                map.setFilter(id, base ? ["all", base, filter] : filter);
            });

            if (map.getLayer(BADGE_LAYER_ID)) {
                map.setFilter(BADGE_LAYER_ID, ["all",
                    [">=", ["to-number", ["get", "WalkCount"], 1], 2],
                    filter
                ]);
            }

            state.walk = walk || null;
            updateWalkRoutes();

            const matches = [];

            state.assets.forEach((asset) => {
                const onWalk = !walk || asset.walks.includes(walk);
                map.setFeatureState(
                    { source: SOURCE_ID, id: asset.id },
                    { dim: !onWalk }
                );
                if (onWalk && categories.includes(asset.category)) {
                    matches.push(asset.id);
                }
            });

            return matches;
        };

        // Updates which points are drawn larger on the focus layer.
        function updateLifted() {

            const ids = [...new Set(
                [state.hovered, state.highlighted, state.selected]
                    .filter((id) => id !== null && id !== undefined)
            )];

            const added = ids.some((id) => !state.liftedIds.includes(id));

            state.liftedIds.forEach((id) => {
                if (!ids.includes(id)) {
                    map.setFeatureState({ source: SOURCE_ID, id }, { lifted: false });
                }
            });
            ids.forEach((id) => {
                map.setFeatureState({ source: SOURCE_ID, id }, { lifted: true });
            });

            state.liftedIds = ids;

            if (map.getLayer(FOCUS_LAYER_ID)) {
                map.setFilter(FOCUS_LAYER_ID, ["all",
                    ["in", ["to-number", ["id"], -1], ["literal", ids]],
                    categoryFilterExpression()
                ]);
                if (added) {
                    animateGrow();
                }
            }
        }

        // Quick grow animation on the focus layer
        function animateGrow() {

            if (state.animation) {
                cancelAnimationFrame(state.animation);
                state.animation = null;
            }

            if (reducedMotion.matches) {
                map.setLayoutProperty(FOCUS_LAYER_ID, "icon-size", SYMBOL.hoverScale);
                return;
            }

            const start = performance.now();

            function step(now) {
                const t = Math.min(Math.max((now - start) / SYMBOL.hoverDuration, 0), 1);
                const eased = 1 - Math.pow(1 - t, 3);
                map.setLayoutProperty(FOCUS_LAYER_ID, "icon-size",
                    1 + (SYMBOL.hoverScale - 1) * eased);
                state.animation = t < 1 ? requestAnimationFrame(step) : null;
            }

            map.setLayoutProperty(FOCUS_LAYER_ID, "icon-size", 1);
            state.animation = requestAnimationFrame(step);
        }

        // Highlight from the list (hover / keyboard focus)
        camMap.setHighlight = function (id) {
            if (state.highlighted === id) {
                return;
            }
            state.highlighted = id;
            updateLifted();
        };

        // Selected point (its card is open)
        camMap.select = function (id) {
            state.selected = id;
            if (map.getLayer(RING_LAYER_ID)) {
                map.setFilter(RING_LAYER_ID, ["all",
                    ["==", ["to-number", ["id"], -1], id ?? -1],
                    categoryFilterExpression()
                ]);
            }
            updateLifted();
        };

        function cameraOptions() {
            return { duration: reducedMotion.matches ? 0 : 700 };
        }

        // Fits the view to a set of point ids (all if empty).
        camMap.fitToIds = function (ids, options) {

            const list = ids && ids.length
                ? ids.map((id) => state.byId.get(id)).filter(Boolean)
                : state.assets;

            const bounds = new maplibregl.LngLatBounds();
            list.forEach((a) => a.coordinates && bounds.extend(a.coordinates));

            // Include the walk's route line, if there is one
            const walk = options && options.walk;
            if (walk && state.routeCoords[walk]) {
                state.routeCoords[walk].forEach((c) => bounds.extend(c));
            }

            if (bounds.isEmpty()) {
                return;
            }

            const padding = safePadding(camMap.getViewPadding());

            map.fitBounds(bounds, {
                padding: padding,
                maxZoom: FIT_MAX_ZOOM,
                ...cameraOptions(),
                ...(options && options.instant ? { duration: 0 } : {})
            });
        };

        // Moves to one point, keeping it clear of the panel.
        camMap.flyTo = function (id) {

            const asset = state.byId.get(id);
            if (!asset || !asset.coordinates) {
                return;
            }

            const p = safePadding(camMap.getViewPadding());

            map.easeTo({
                center: asset.coordinates,
                zoom: Math.max(map.getZoom(), 16),
                offset: [(p.left - p.right) / 2, (p.top - p.bottom) / 2],
                ...cameraOptions()
            });
        };

        // Never let padding eat the whole map (small embeds).
        function safePadding(padding) {
            const canvas = map.getCanvas();
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            const p = { ...padding };
            if (p.top + p.bottom > h * 0.8) {
                const scale = (h * 0.8) / (p.top + p.bottom);
                p.top *= scale;
                p.bottom *= scale;
            }
            if (p.left + p.right > w * 0.8) {
                const scale = (w * 0.8) / (p.left + p.right);
                p.left *= scale;
                p.right *= scale;
            }
            return p;
        }


        // ----------------------------------------------------
        // MAP HOVER + CLICK
        // ----------------------------------------------------

        function setupPointerEvents(map) {

            map.on("mousemove", HIT_LAYER_ID, (e) => {
                const feature = e.features && e.features[0];
                const id = feature ? Number(feature.id ?? feature.properties[ID_FIELD]) : null;
                if (id !== state.hovered) {
                    state.hovered = id;
                    updateLifted();
                    emit("pointhover", id);
                }
            });

            map.on("mouseleave", HIT_LAYER_ID, () => {
                state.hovered = null;
                updateLifted();
                emit("pointhover", null);
            });

            map.on("click", (e) => {

                const points = map.queryRenderedFeatures(e.point, { layers: [HIT_LAYER_ID] });

                if (points.length) {
                    // Closest point to the click wins
                    const closest = points
                        .map((f) => ({
                            f,
                            d: map.project(f.geometry.coordinates).dist(e.point)
                        }))
                        .sort((a, b) => a.d - b.d)[0].f;
                    emit("pointclick", Number(closest.id ?? closest.properties[ID_FIELD]));
                    return;
                }

                // IBX stations, then walk routes, then the IBX line
                const pick = (layer) => map.getLayer(layer)
                    ? map.queryRenderedFeatures(e.point, { layers: [layer] })[0]
                    : null;

                const station = pick(IBX_STATIONS);
                if (station) {
                    emit("areaclick", {
                        kind: "IBX station",
                        title: station.properties.StationName,
                        properties: station.properties
                    });
                    return;
                }

                const route = pick(WALK_HIT);
                if (route && route.properties.walk) {
                    emit("walkclick", route.properties.walk);
                    return;
                }

                if (pick(IBX_HIT)) {
                    const ibx = (window.CAM_CONTENT && window.CAM_CONTENT.ibx) || {};
                    emit("areaclick", {
                        kind: "Transit",
                        title: ibx.name || "Interborough Express (IBX)",
                        properties: { Description: ibx.description || "" }
                    });
                    return;
                }

                const areaLayers = AREA_LAYERS.filter((id) => map.getLayer(id));
                const areas = areaLayers.length
                    ? map.queryRenderedFeatures(e.point, { layers: areaLayers })
                    : [];

                if (areas.length) {
                    const f = areas[0];
                    emit("areaclick", {
                        kind: f.layer.id === CORRIDOR_LAYER ? "Corridor" : "District",
                        properties: f.properties
                    });
                    return;
                }

                emit("mapclick", null);
            });
        }


        // ----------------------------------------------------
        // DISTRICTS + CORRIDORS (only if a file is set above)
        // ----------------------------------------------------

        const DISTRICT_FILL = "cam_districts_fill";
        const DISTRICT_LINE = "cam_districts_line";
        const DISTRICT_LABEL = "cam_districts_label";
        const CORRIDOR_LAYER = "cam_corridors";
        const AREA_LAYERS = [DISTRICT_FILL, CORRIDOR_LAYER];
        const ALL_AREA_LAYERS = [DISTRICT_FILL, DISTRICT_LINE, DISTRICT_LABEL, CORRIDOR_LAYER];

        camMap.areas = { available: false, districts: false, corridors: false };

        function loadAreas(map) {

            const visibility = AREAS.visibleOnLoad ? "visible" : "none";
            const below = RING_LAYER_ID;   // all area layers sit under the points
            const jobs = [];

            if (AREAS.districtsFile) {
                jobs.push(fetch(AREAS.districtsFile)
                    .then((r) => { if (!r.ok) { throw new Error(r.status); } return r.json(); })
                    .then((data) => {
                        map.addSource("cam_districts", { type: "geojson", data });
                        map.addLayer({
                            id: DISTRICT_FILL, type: "fill", source: "cam_districts",
                            layout: { visibility },
                            paint: { "fill-color": AREAS.color, "fill-opacity": AREAS.districtFillOpacity }
                        }, below);
                        map.addLayer({
                            id: DISTRICT_LINE, type: "line", source: "cam_districts",
                            layout: { visibility },
                            paint: {
                                "line-color": AREAS.color,
                                "line-width": 1.5,
                                "line-dasharray": [3, 2]
                            }
                        }, below);
                        map.addLayer({
                            id: DISTRICT_LABEL, type: "symbol", source: "cam_districts",
                            layout: {
                                visibility,
                                "text-field": ["upcase", ["to-string", ["get", "Name"]]],
                                "text-font": ["Noto Sans Regular"],
                                "text-size": 11,
                                "text-letter-spacing": 0.12,
                                "text-max-width": 8
                            },
                            paint: {
                                "text-color": AREAS.color,
                                "text-halo-color": "rgba(255, 255, 255, 0.9)",
                                "text-halo-width": 1.5
                            }
                        }, below);
                        camMap.areas.districts = true;
                    })
                    .catch((error) => console.warn("Districts file not loaded:", error)));
            }

            if (AREAS.corridorsFile) {
                jobs.push(fetch(AREAS.corridorsFile)
                    .then((r) => { if (!r.ok) { throw new Error(r.status); } return r.json(); })
                    .then((data) => {
                        map.addSource("cam_corridors", { type: "geojson", data });
                        map.addLayer({
                            id: CORRIDOR_LAYER, type: "line", source: "cam_corridors",
                            layout: { visibility, "line-cap": "round", "line-join": "round" },
                            paint: {
                                "line-color": AREAS.color,
                                "line-width": AREAS.corridorWidth,
                                "line-opacity": AREAS.corridorOpacity
                            }
                        }, below);
                        camMap.areas.corridors = true;
                    })
                    .catch((error) => console.warn("Corridors file not loaded:", error)));
            }

            camMap.areasReady = Promise.all(jobs).then(() => {
                camMap.areas.available = camMap.areas.districts || camMap.areas.corridors;

                AREA_LAYERS.forEach((id) => {
                    if (!map.getLayer(id)) {
                        return;
                    }
                    map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
                    map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
                });

                return camMap.areas;
            });
        }

        // ----------------------------------------------------
        // WALK ROUTES + IBX
        // ----------------------------------------------------

        const WALK_CASING = "cam_walk_casing";
        const WALK_LINE = "cam_walk_line";
        const WALK_HIT = "cam_walk_hit";
        const IBX_CASING = "cam_ibx_casing";
        const IBX_LINE = "cam_ibx_line";
        const IBX_HIT = "cam_ibx_hit";
        const IBX_STATIONS = "cam_ibx_stations";
        const IBX_LABELS = "cam_ibx_labels";

        const ROUTE_GROUPS = {
            walks: [WALK_CASING, WALK_LINE, WALK_HIT],
            ibx: [IBX_CASING, IBX_LINE, IBX_HIT, IBX_STATIONS, IBX_LABELS]
        };

        camMap.routes = { walks: false, ibx: false };

        function getJSON(url) {
            return fetch(url).then((r) => {
                if (!r.ok) {
                    throw new Error(`${url}: ${r.status}`);
                }
                return r.json();
            });
        }

        function collectCoords(geometry, out) {
            const walk = (c) => (typeof c[0] === "number" ? out.push(c) : c.forEach(walk));
            if (geometry && geometry.coordinates) {
                walk(geometry.coordinates);
            }
            return out;
        }

        function loadRoutes(map) {

            const walkJobs = Object.entries(ROUTES.walkFiles).map(([number, url]) =>
                getJSON(url)
                    .then((data) => ({ letter: walkLetter(number), data }))
                    .catch((error) => {
                        console.warn("Walk route not loaded:", error);
                        return null;
                    }));

            const ibxJobs = [
                ROUTES.ibxFile ? getJSON(ROUTES.ibxFile).catch((e) => { console.warn("IBX line not loaded:", e); return null; }) : null,
                ROUTES.ibxStationsFile ? getJSON(ROUTES.ibxStationsFile).catch((e) => { console.warn("IBX stations not loaded:", e); return null; }) : null
            ];

            camMap.routesReady = Promise.all([Promise.all(walkJobs), Promise.all(ibxJobs)])
                .then(([walks, [ibxLine, ibxStations]]) => {

                    // Layers are added bottom to top, all under the points
                    const below = RING_LAYER_ID;

                    // ---- IBX line
                    if (ibxLine) {
                        map.addSource("cam_ibx", { type: "geojson", data: ibxLine });
                        if (ROUTES.ibxCasing) {
                            map.addLayer({
                                id: IBX_CASING, type: "line", source: "cam_ibx",
                                layout: { "line-cap": "round", "line-join": "round" },
                                paint: { "line-color": ROUTES.ibxCasing, "line-width": ROUTES.ibxWidth + 3 }
                            }, below);
                        }
                        map.addLayer({
                            id: IBX_LINE, type: "line", source: "cam_ibx",
                            layout: { "line-cap": "round", "line-join": "round" },
                            paint: { "line-color": ROUTES.ibxColor, "line-width": ROUTES.ibxWidth }
                        }, below);
                        map.addLayer({
                            id: IBX_HIT, type: "line", source: "cam_ibx",
                            paint: { "line-color": "rgba(0, 0, 0, 0)", "line-width": 16 }
                        }, below);
                        camMap.routes.ibx = true;
                    }

                    // ---- Walk routes (one source, "walk" = letter)
                    const features = [];
                    walks.filter(Boolean).forEach(({ letter, data }) => {
                        const coords = [];
                        (data.features || []).forEach((f) => {
                            features.push({
                                type: "Feature",
                                geometry: f.geometry,
                                properties: { walk: letter }
                            });
                            collectCoords(f.geometry, coords);
                        });
                        state.routeCoords[letter] = coords;
                    });

                    if (features.length) {
                        map.addSource("cam_walks", {
                            type: "geojson",
                            data: { type: "FeatureCollection", features }
                        });
                        map.addLayer({
                            id: WALK_CASING, type: "line", source: "cam_walks",
                            layout: { "line-cap": "round", "line-join": "round" },
                            paint: { "line-color": ROUTES.walkCasing, "line-width": ROUTES.walkWidth + 3 }
                        }, below);
                        map.addLayer({
                            id: WALK_LINE, type: "line", source: "cam_walks",
                            layout: { "line-cap": "round", "line-join": "round" },
                            paint: { "line-color": ROUTES.walkColor, "line-width": ROUTES.walkWidth }
                        }, below);
                        map.addLayer({
                            id: WALK_HIT, type: "line", source: "cam_walks",
                            paint: { "line-color": "rgba(0, 0, 0, 0)", "line-width": 14 }
                        }, below);
                        camMap.routes.walks = true;
                    }

                    // ---- IBX stations (above routes, under points)
                    if (ibxStations) {
                        map.addSource("cam_ibx_stations", { type: "geojson", data: ibxStations });
                        map.addLayer({
                            id: IBX_STATIONS, type: "circle", source: "cam_ibx_stations",
                            paint: {
                                "circle-radius": ROUTES.ibxStationRadius,
                                "circle-color": ROUTES.ibxColor,
                                "circle-stroke-color": ROUTES.ibxStationStrokeColor,
                                "circle-stroke-width": ROUTES.ibxStationStroke
                            }
                        }, below);
                        map.addLayer({
                            id: IBX_LABELS, type: "symbol", source: "cam_ibx_stations",
                            minzoom: ROUTES.ibxStationLabelsMinZoom,
                            layout: {
                                "text-field": ["to-string", ["get", "StationName"]],
                                "text-font": ["Noto Sans Regular"],
                                "text-size": 11,
                                "text-anchor": "left",
                                "text-offset": [0.9, 0],
                                "text-optional": true
                            },
                            paint: {
                                "text-color": "#2E2B29",
                                "text-halo-color": "rgba(255, 255, 255, 0.95)",
                                "text-halo-width": 1.5
                            }
                        }, below);
                    }

                    [WALK_HIT, IBX_HIT, IBX_STATIONS].forEach((id) => {
                        if (!map.getLayer(id)) {
                            return;
                        }
                        map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
                        map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
                    });

                    updateWalkRoutes();
                    return camMap.routes;
                });
        }

        // All routes faint when no walk is selected; otherwise only
        // the selected walk's route, bold with a white edge.
        function updateWalkRoutes() {

            if (!map.getLayer(WALK_LINE)) {
                return;
            }

            const walk = state.walk;
            const only = walk ? ["==", ["get", "walk"], walk] : null;

            [WALK_CASING, WALK_LINE, WALK_HIT].forEach((id) => {
                map.setFilter(id, only);
            });

            map.setLayoutProperty(WALK_CASING, "visibility",
                walk && state.walkRoutesOn !== false ? "visible" : "none");

            map.setPaintProperty(WALK_LINE, "line-color", walk ? ROUTES.walkColor : ROUTES.walkAllColor);
            map.setPaintProperty(WALK_LINE, "line-width", walk ? ROUTES.walkWidth : ROUTES.walkAllWidth);
            map.setPaintProperty(WALK_LINE, "line-opacity", walk ? 1 : ROUTES.walkAllOpacity);
        }

        // group: "walks" or "ibx"
        camMap.setRoutesVisible = function (group, visible) {
            if (group === "walks") {
                state.walkRoutesOn = visible;
            }
            (ROUTE_GROUPS[group] || []).forEach((id) => {
                if (map.getLayer(id)) {
                    map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
                }
            });
            if (group === "walks") {
                updateWalkRoutes();
            }
        };

        camMap.routeStyle = ROUTES;

        camMap.setAreasVisible = function (visible) {
            ALL_AREA_LAYERS.forEach((id) => {
                if (map.getLayer(id)) {
                    map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
                }
            });
        };
    });

})();
