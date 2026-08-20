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
        // SYMBOL / LABEL
        // ----------------------------------------------------

        else if (layerConfig.type === "symbol") {

            map.addLayer({
                id: layerConfig.id,
                type: "symbol",
                source: sourceId,

                layout: {
                    "text-field": layerConfig.style.textField,
                    "text-size": layerConfig.style.textSize,
                    "text-font": layerConfig.style.textFont || ["Noto Sans Regular"],
                    "text-anchor": "center",
                    "text-allow-overlap": true
                },

                paint: {
                    "text-color": layerConfig.style.textColor
                }
            });
        }


        //-----------------------------------------------------
        // POPUPS
        //-----------------------------------------------------

       if (layerConfig.popup) {

    map.on("click", layerConfig.id, (e) => {

        if (!e.features || !e.features.length) {
            return;
        }

        const properties = e.features[0].properties;
        const popupConfig = layerConfig.popup;

        let popupHTML = "";

        // TITLE
        if (popupConfig.titleField) {

            const titleValue =
                properties[popupConfig.titleField] ?? "";

            popupHTML += `
                <div class="map-popup-title">
                    ${popupConfig.titlePrefix || ""}${titleValue}
                </div>
            `;
        }


        // IMAGE
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


        // IMAGE CAPTION
        if (
            popupConfig.imageCaptionField &&
            properties[popupConfig.imageCaptionField]
        ) {

            popupHTML += `
                <div class="map-popup-caption">
                    ${properties[popupConfig.imageCaptionField]}
                </div>
            `;
        }


        // ATTRIBUTE FIELDS
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


        // CREATE POPUP
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