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

            map.addLayer({
                id: layerConfig.id,
                type: "line",
                source: sourceId,

                paint: {
                    "line-color": layerConfig.style.color,
                    "line-width": layerConfig.style.width,
                    "line-dasharray": layerConfig.style.dasharray
                }
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
                // TITLE
                // ------------------------------------------------

                if (popupConfig.titleField) {

                    const titleValue =
                        properties[popupConfig.titleField] ?? "";

                    const titlePrefix =
                        popupConfig.titlePrefix || "";

                    popupHTML += `
                        <div class="map-popup-title">
                            ${titlePrefix}${titleValue}
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
                // Used for POI "Use"
                if (
                    popupConfig.captionBoldField &&
                    properties[popupConfig.captionBoldField]
                ) {

                    captionHTML += `
                        <strong>${properties[popupConfig.captionBoldField]}</strong>
                    `;
                }


                // Regular caption field
                // Used for POI "image_sour"
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
                // Used by Development Sites
                if (
                    !popupConfig.captionField &&
                    popupConfig.imageCaptionField &&
                    properties[popupConfig.imageCaptionField]
                ) {

                    captionHTML +=
                        properties[popupConfig.imageCaptionField];
                }


                // Add caption to popup
                if (captionHTML) {

                    popupHTML += `
                        <div class="map-popup-caption">
                            ${captionHTML}
                        </div>
                    `;
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

});