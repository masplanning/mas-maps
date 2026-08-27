// ============================================================
// SHARED MAPLIBRE MAP ENGINE
// ============================================================

const config = window.mapConfig;

if (!config) {
    throw new Error(
        "No mapConfig found. Make sure config.js loads before map.js."
    );
}


// ============================================================
// CREATE MAP
// ============================================================

const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/positron",
    center: config.center,
    zoom: config.zoom
});


// ============================================================
// NAVIGATION CONTROLS
// ============================================================

map.addControl(
    new maplibregl.NavigationControl(),
    "top-right"
);


// ============================================================
// LOAD MAP LAYERS
// ============================================================

map.on("load", () => {

    config.layers.forEach((layerConfig) => {

        const sourceId =
            `${layerConfig.sourceId || layerConfig.id}_source`;


        // ----------------------------------------------------
        // ADD GEOJSON SOURCE
        // ----------------------------------------------------

        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: "geojson",
                data: layerConfig.file
            });
        }


        // ----------------------------------------------------
        // FILL
        // ----------------------------------------------------

        if (layerConfig.type === "fill") {

            map.addLayer({
                id: layerConfig.id,
                type: "fill",
                source: sourceId,

                paint: {
                    "fill-color": layerConfig.style.color,
                    "fill-opacity": layerConfig.style.opacity
                }
            });
        }


        // ----------------------------------------------------
        // LINE
        // ----------------------------------------------------

        else if (layerConfig.type === "line") {

            const linePaint = {
                "line-color": layerConfig.style.color,
                "line-width": layerConfig.style.width
            };

            // Only add a dash array when the layer actually has one.
            if (layerConfig.style.dasharray) {
                linePaint["line-dasharray"] =
                    layerConfig.style.dasharray;
            }

            map.addLayer({
                id: layerConfig.id,
                type: "line",
                source: sourceId,
                paint: linePaint
            });
        }

        // ----------------------------------------------------
        // CIRCLE
        // ----------------------------------------------------

        else if (layerConfig.type === "circle") {

            map.addLayer({
                id: layerConfig.id,
                type: "circle",
                source: sourceId,

                paint: {
                    "circle-color": layerConfig.style.color,
                    "circle-radius": layerConfig.style.radius
                }
            });
        }


        // ----------------------------------------------------
        // SYMBOL / LABEL / ICON
        // ----------------------------------------------------

        else if (layerConfig.type === "symbol") {

            const layout = {};
            const paint = {};


            // ICON
            if (layerConfig.style.icon) {

                layout["icon-image"] =
                    layerConfig.style.icon;

                layout["icon-size"] =
                    layerConfig.style.iconSize || 1;

                layout["icon-allow-overlap"] = true;
            }


            // TEXT LABEL
            if (layerConfig.style.textField) {

                layout["text-field"] =
                    layerConfig.style.textField;

                layout["text-size"] =
                    layerConfig.style.textSize;

                layout["text-font"] =
                    layerConfig.style.textFont ||
                    ["Noto Sans Regular"];

                layout["text-anchor"] = "center";
                layout["text-allow-overlap"] = true;

                paint["text-color"] =
                    layerConfig.style.textColor;
            }


            map.addLayer({
                id: layerConfig.id,
                type: "symbol",
                source: sourceId,
                layout: layout,
                paint: paint
            });
        }


        // ----------------------------------------------------
        // POPUPS
        // ----------------------------------------------------

        if (layerConfig.popup) {

            map.on("click", layerConfig.id, (e) => {

                if (!e.features || !e.features.length) {
                    return;
                }

                const properties =
                    e.features[0].properties;

                const popupConfig =
                    layerConfig.popup;

                let popupHTML = "";


                // ------------------------------------------------
                // HELPER: BUILD TEXT FROM STATIC TEXT + FIELDS
                // ------------------------------------------------

                function buildText(parts, properties) {

                    if (!parts) {
                        return "";
                    }

                    return parts
                        .map((part) => {

                            if (part.text !== undefined) {
                                return part.text;
                            }

                            if (part.field !== undefined) {
                                return properties[part.field] ?? "";
                            }

                            return "";
                        })
                        .join("");
                }


                // ------------------------------------------------
                // TITLE
                // Supports:
                // - titleParts
                // - OR titlePrefix + titleField
                // ------------------------------------------------

                let titleHTML = "";

                if (popupConfig.titleParts) {

                    titleHTML = buildText(
                        popupConfig.titleParts,
                        properties
                    );
                }

                else if (popupConfig.titleField) {

                    const titleValue =
                        properties[popupConfig.titleField] ?? "";

                    const titlePrefix =
                        popupConfig.titlePrefix || "";

                    titleHTML =
                        `${titlePrefix}${titleValue}`;
                }


                if (titleHTML) {

                    popupHTML += `
                        <div class="map-popup-title">
                            ${titleHTML}
                        </div>
                    `;
                }


                // ------------------------------------------------
                // IMAGE
                // ------------------------------------------------

                if (
                    popupConfig.imageField &&
                    properties[popupConfig.imageField]
                ) {

                    popupHTML += `
                        <img
                            class="map-popup-image"
                            src="${properties[popupConfig.imageField]}"
                            alt=""
                        >
                    `;
                }


                // ------------------------------------------------
                // IMAGE CAPTION
                // ------------------------------------------------

                let captionHTML = "";


                // Bold caption field
                if (
                    popupConfig.captionBoldField &&
                    properties[popupConfig.captionBoldField]
                ) {

                    captionHTML += `
                        <strong>${properties[popupConfig.captionBoldField]}</strong>
                    `;
                }


                // Regular caption field
                if (
                    popupConfig.captionField &&
                    properties[popupConfig.captionField]
                ) {

                    if (captionHTML) {
                        captionHTML += " ";
                    }

                    captionHTML +=
                        properties[popupConfig.captionField];
                }


                // Simple image caption
                if (
                    !popupConfig.captionField &&
                    popupConfig.imageCaptionField &&
                    properties[popupConfig.imageCaptionField]
                ) {

                    captionHTML +=
                        properties[popupConfig.imageCaptionField];
                }


                if (captionHTML) {

                    popupHTML += `
                        <div class="map-popup-caption">
                            ${captionHTML}
                        </div>
                    `;
                }


                // ------------------------------------------------
                // INTRO TEXT
                // Supports static text + feature fields
                // ------------------------------------------------

                if (popupConfig.intro) {

                    const introText =
                        buildText(
                            popupConfig.intro,
                            properties
                        );

                    if (introText) {

                        popupHTML += `
                            <div class="map-popup-intro">
                                ${introText}
                            </div>
                        `;
                    }
                }


                // ------------------------------------------------
                // ATTRIBUTE FIELDS
                // ------------------------------------------------

                if (popupConfig.fields) {

                    popupConfig.fields.forEach((fieldConfig) => {

                        const value =
                            properties[fieldConfig.field];

                        if (
                            value !== null &&
                            value !== undefined &&
                            value !== ""
                        ) {

                            popupHTML += `
                                <div class="map-popup-field">
                                    <strong>${fieldConfig.label}:</strong>
                                    ${value}
                                </div>
                            `;
                        }

                    });
                }


                // ------------------------------------------------
                // CREATE POPUP
                // ------------------------------------------------

                new maplibregl.Popup({
                    closeButton: true,
                    closeOnClick: true,
                    maxWidth: "320px"
                })
                    .setLngLat(e.lngLat)
                    .setHTML(popupHTML)
                    .addTo(map);

            });
        }


        // ----------------------------------------------------
        // POINTER CURSOR FOR INTERACTIVE LAYERS
        // ----------------------------------------------------

        if (layerConfig.interactive) {

            map.on("mouseenter", layerConfig.id, () => {
                map.getCanvas().style.cursor = "pointer";
            });

            map.on("mouseleave", layerConfig.id, () => {
                map.getCanvas().style.cursor = "";
            });
        }

    });


    // ========================================================
    // INTERACTIVE LEGEND / LAYER CONTROL
    // ========================================================

    if (config.controls && config.controls.items) {

        const control = document.createElement("div");
        control.className = "map-layer-control";


        // ----------------------------------------------------
        // HEADER
        // ----------------------------------------------------

        const header = document.createElement("button");
        header.className = "map-layer-control-header";
        header.type = "button";

        header.innerHTML = `
            <span>${config.controls.title || "Layers"}</span>
            <span class="map-layer-control-toggle">−</span>
        `;

        control.appendChild(header);


        // ----------------------------------------------------
        // CONTENT
        // ----------------------------------------------------

        const content = document.createElement("div");
        content.className = "map-layer-control-content";

        control.appendChild(content);


        // ----------------------------------------------------
        // CREATE EACH LEGEND / CHECKBOX ROW
        // ----------------------------------------------------

        config.controls.items.forEach((item, index) => {

            const row = document.createElement("label");
            row.className = "map-layer-control-row";


            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = true;
            checkbox.className = "map-layer-control-checkbox";

            checkbox.dataset.controlIndex = index;


            // ------------------------------------------------
            // SYMBOL
            // ------------------------------------------------

            const swatch = document.createElement("span");
            swatch.className = "map-layer-control-swatch";


            if (item.symbol) {

                if (item.symbol.type === "fill") {

                    swatch.classList.add(
                        "map-layer-control-swatch-fill"
                    );

                    swatch.style.backgroundColor =
                        item.symbol.color;

                    swatch.style.opacity =
                        item.symbol.opacity ?? 1;
                }


                else if (item.symbol.type === "line") {

                    swatch.classList.add(
                        "map-layer-control-swatch-line"
                    );

                    swatch.style.borderTopColor =
                        item.symbol.color;

                    swatch.style.borderTopStyle =
                        item.symbol.dashed
                            ? "dashed"
                            : "solid";
                }


                else if (item.symbol.type === "circle") {

                    swatch.classList.add(
                        "map-layer-control-swatch-circle"
                    );

                    swatch.style.backgroundColor =
                        item.symbol.color;
                }
            }


            // ------------------------------------------------
            // LABEL
            // ------------------------------------------------

            const labelText = document.createElement("span");
            labelText.className =
                "map-layer-control-label";

            labelText.textContent = item.label;


            row.appendChild(checkbox);
            row.appendChild(swatch);
            row.appendChild(labelText);

            content.appendChild(row);
        });


        // ----------------------------------------------------
        // WHOLE-LAYER VISIBILITY
        // ----------------------------------------------------

        function updateLayerVisibility(item, checked) {

            if (!map.getLayer(item.layer)) {
                return;
            }

            map.setLayoutProperty(
                item.layer,
                "visibility",
                checked ? "visible" : "none"
            );
        }


        // ----------------------------------------------------
        // CATEGORY FILTERING
        // ----------------------------------------------------

        function updateCategoryLayer(layerId, field) {

            const relatedItems =
                config.controls.items.filter((item, index) => {

                    if (
                        item.type !== "category" ||
                        item.layer !== layerId ||
                        item.field !== field
                    ) {
                        return false;
                    }

                    const checkbox =
                        content.querySelector(
                            `input[data-control-index="${index}"]`
                        );

                    return checkbox && checkbox.checked;
                });


            const enabledValues =
                relatedItems.map((item) => item.value);


            let filter;


            // No categories selected
            if (enabledValues.length === 0) {

                filter = [
                    "==",
                    ["get", field],
                    "__NO_MATCH__"
                ];
            }


            // One or more categories selected
            else {

                filter = [
                    "match",
                    ["get", field],
                    enabledValues,
                    true,
                    false
                ];
            }


            // Apply filter to main layer
            if (map.getLayer(layerId)) {
                map.setFilter(layerId, filter);
            }


            // ------------------------------------------------
            // APPLY SAME FILTER TO LINKED LAYERS
            // ------------------------------------------------

            const linkedLayers = new Set();


            config.controls.items.forEach((item) => {

                if (
                    item.type === "category" &&
                    item.layer === layerId &&
                    item.field === field &&
                    item.linkedLayer
                ) {

                    linkedLayers.add(item.linkedLayer);
                }
            });


            linkedLayers.forEach((linkedLayer) => {

                if (map.getLayer(linkedLayer)) {
                    map.setFilter(linkedLayer, filter);
                }
            });
        }


        // ----------------------------------------------------
        // CHECKBOX EVENTS
        // ----------------------------------------------------

        content.addEventListener("change", (event) => {

            if (
                !event.target.classList.contains(
                    "map-layer-control-checkbox"
                )
            ) {
                return;
            }


            const index =
                Number(event.target.dataset.controlIndex);

            const item =
                config.controls.items[index];


            // Whole layer
            if (item.type === "layer") {

                updateLayerVisibility(
                    item,
                    event.target.checked
                );
            }


            // Category within a layer
            else if (item.type === "category") {

                updateCategoryLayer(
                    item.layer,
                    item.field
                );
            }
        });


        // ----------------------------------------------------
        // COLLAPSE / EXPAND
        // ----------------------------------------------------

        header.addEventListener("click", () => {

            const collapsed =
                control.classList.toggle("collapsed");

            content.hidden = collapsed;


            const toggle =
                header.querySelector(
                    ".map-layer-control-toggle"
                );

            toggle.textContent =
                collapsed ? "+" : "−";
        });


        // ----------------------------------------------------
        // ADD CONTROL TO PAGE
        // ----------------------------------------------------

        document.body.appendChild(control);
    }

});