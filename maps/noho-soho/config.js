window.mapConfig = {

    center: [-73.9965, 40.7245],
    zoom: 15,


    // ========================================================
    // LEGEND / LAYER CONTROLS
    // ========================================================

    controls: {

        title: "Layers",

        items: [

            {
                label: "Rezoning Boundaries",
                type: "layer",
                layer: "rezoning_boundaries",

                symbol: {
                    type: "line",
                    color: "#e40e62",
                    dashed: false
                }
            },

            {
                label: "Historic Districts (S/NR)",
                type: "layer",
                layer: "shpo_historic_districts",

                symbol: {
                    type: "fill",
                    color: "#008c87",
                    opacity: 0.24
                }
            },

            {
                label: "M1-5/R7X",
                type: "category",
                layer: "rezoning_subareas",
                field: "newzone",
                value: "M1-5/R7X",

                symbol: {
                    type: "fill",
                    color: "#ff7f7b",
                    opacity: 0.50
                }
            },

            {
                label: "M1-5/R9X",
                type: "category",
                layer: "rezoning_subareas",
                field: "newzone",
                value: "M1-5/R9X",

                symbol: {
                    type: "fill",
                    color: "#e9407e",
                    opacity: 0.50
                }
            },

            {
                label: "M1-6/R10",
                type: "category",
                layer: "rezoning_subareas",
                field: "newzone",
                value: "M1-6/R10",

                symbol: {
                    type: "fill",
                    color: "#8a234c",
                    opacity: 0.50
                }
            },

            {
                label: "Historic Districts (NYC)",
                type: "layer",
                layer: "lpc_historic_districts",

                symbol: {
                    type: "fill",
                    color: "#0078c6",
                    opacity: 0.24
                }
            },

            {
                label: "S/NR Listed & Eligible",
                type: "layer",
                layer: "snr_sites",

                symbol: {
                    type: "line",
                    color: "#ffd400",
                    dashed: false
                }
            },

            {
                label: "Landmarked Buildings",
                type: "layer",
                layer: "lpc_sites",

                symbol: {
                    type: "fill",
                    color: "#0078c6",
                    opacity: 1
                }
            },

            {
                label: "Projected Development Sites",
                type: "category",
                layer: "dev_sites",
                field: "projected",
                value: 1,

                symbol: {
                    type: "fill",
                    color: "#ca562c",
                    opacity: 1
                }
            },

            {
                label: "Potential Development Sites",
                type: "category",
                layer: "dev_sites",
                field: "projected",
                value: 0,

                symbol: {
                    type: "fill",
                    color: "#3d5941",
                    opacity: 1
                }
            }

        ]
    },


    // ========================================================
    // MAP LAYERS
    // ========================================================

    layers: [


        // ====================================================
        // 1. REZONING BOUNDARIES
        // ====================================================

        {
            id: "rezoning_boundaries",
            name: "Rezoning Boundaries",
            file: "./data/rezoning_boundaries.geojson",
            type: "line",
            interactive: false,

            style: {
                color: "#e40e62",
                width: 3
            }
        },


        // ====================================================
        // 2. HISTORIC DISTRICTS (S/NR)
        // ====================================================

        {
            id: "shpo_historic_districts",
            name: "Historic Districts (S/NR)",
            file: "./data/shpo_historic_districts.geojson",
            type: "fill",
            interactive: true,

            style: {
                color: "#008c87",
                opacity: 0.24
            },

            popup: {
                titleField: "resname",

                fields: [
                    {
                        field: "address",
                        label: "Address"
                    },
                    {
                        field: "srdate",
                        label: "SR Date"
                    },
                    {
                        field: "nrnum",
                        label: "NR Number"
                    },
                    {
                        field: "refnum",
                        label: "Reference Number"
                    },
                    {
                        field: "Shape__Area",
                        label: "Shape Area"
                    }
                ]
            }
        },


        // ====================================================
        // 3. REZONING SUBAREAS
        // ====================================================

        {
            id: "rezoning_subareas",
            name: "Rezoning Subareas",
            file: "./data/rezoning_subareas.geojson",
            type: "fill",
            interactive: true,

            style: {
                color: [
                    "case",

                    ["==", ["get", "newzone"], "M1-5/R7X"],
                    "#ff7f7b",

                    ["==", ["get", "newzone"], "M1-5/R9X"],
                    "#e9407e",

                    ["==", ["get", "newzone"], "M1-6/R10"],
                    "#8a234c",

                    "#cccccc"
                ],

                opacity: 0.50
            },

            popup: {
                titleField: "newzone",

                fields: [
                    {
                        field: "oldzone",
                        label: "Old Zoning"
                    }
                ]
            }
        },


        // ====================================================
        // 4. HISTORIC DISTRICTS (NYC)
        // ====================================================

        {
            id: "lpc_historic_districts",
            name: "Historic Districts (NYC)",
            file: "./data/lpc_historic_districts.geojson",
            type: "fill",
            interactive: true,

            style: {
                color: "#0078c6",
                opacity: 0.24
            },

            popup: {
                titleField: "area_name",

                fields: [
                    {
                        field: "desdate",
                        label: "Designation Date"
                    },
                    {
                        field: "extension",
                        label: "Extension"
                    },
                    {
                        field: "last_actio",
                        label: "Last Action"
                    },
                    {
                        field: "lp_number",
                        label: "LP Number"
                    }
                ]
            }
        },


        // ====================================================
        // 5. S/NR LISTED & ELIGIBLE
        // ====================================================

        {
            id: "snr_sites",
            name: "S/NR Listed & Eligible",
            file: "./data/snr_sites.geojson",
            type: "line",
            interactive: true,

            style: {
                color: "#ffd400",
                width: 5
            },

            popup: {
                titleField: "address",

                fields: [
                    {
                        field: "histdist",
                        label: "Historic District"
                    },
                    {
                        field: "status_1",
                        label: "Status"
                    },
                    {
                        field: "yearbuilt",
                        label: "Year Built"
                    }
                ]
            }
        },


        // ====================================================
        // 6. LANDMARKED BUILDINGS
        // ====================================================

        {
            id: "lpc_sites",
            name: "Landmarked Buildings",
            file: "./data/lpc_sites.geojson",
            type: "fill",
            interactive: true,

            style: {
                color: "#0078c6",
                opacity: 1
            },

            popup: {
                titleField: "lmkname",

                fields: [
                    {
                        field: "address",
                        label: "Address"
                    },
                    {
                        field: "histdist",
                        label: "Historic District"
                    },
                    {
                        field: "lmkdesigda",
                        label: "Designation Date"
                    },
                    {
                        field: "yearbuilt",
                        label: "Year Built"
                    }
                ]
            }
        },


        // ====================================================
        // 7. DEVELOPMENT SITES
        // ====================================================

        {
            id: "dev_sites",
            name: "Development Sites",
            file: "./data/dev_sites.geojson",
            type: "fill",
            interactive: true,

            style: {
                color: [
                    "case",

                    ["==", ["get", "projected"], 1],
                    "#ca562c",

                    ["==", ["get", "projected"], 0],
                    "#3d5941",

                    "#cccccc"
                ],

                opacity: 1
            },

            popup: {
                titleField: "address",

                imageField: "right_img_",

                fields: [
                    {
                        field: "right_site",
                        label: "Site Number"
                    },
                    {
                        field: "block",
                        label: "Block"
                    },
                    {
                        field: "lot",
                        label: "Lot"
                    },
                    {
                        field: "builtfar",
                        label: "Current FAR"
                    },
                    {
                        field: "prop_far",
                        label: "Proposed FAR"
                    },
                    {
                        field: "unitsres",
                        label: "# Current Residential Units"
                    },
                    {
                        field: "prop_resun",
                        label: "# Proposed Residential Units"
                    },
                    {
                        field: "lotcount",
                        label: "# Lots in Development"
                    },
                    {
                        field: "right_futu",
                        label: "Future Development"
                    },
                    {
                        field: "right_stat",
                        label: "Historic Designation"
                    }
                ]
            }
        }

    ]

};