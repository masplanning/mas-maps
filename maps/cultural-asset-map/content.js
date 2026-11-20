// ============================================================
// PANEL TEXT + WALK DETAILS
// ============================================================
//
// All the words shown in the side panel live here, so they can
// be edited without touching any map code.
//
// - Keep the quotation marks around each piece of text.
// - To add another summary paragraph, add another line in the
//   "summary" list (each one ends with a comma).
// - Lines starting with // are notes and are not shown.
// ============================================================

window.CAM_CONTENT = {

    organization: "Municipal Art Society of New York",
    organizationShort: "MAS",

    // Logo at the top of the panel (files live in /images at the
    // top of the repo). Set logoLink to "" for no link.
    logo: "../../images/MAS-Full-BY.svg",
    logoLink: "https://www.mas.org/",

    eyebrow: "Livable Neighborhoods Program 2026",

    title: "Elmhurst & Jackson Heights Cultural Asset Map",

    // TODO: replace with the final summary copy.
    summary: [
        "TODO: Summary paragraph. Residents of Elmhurst and Jackson Heights named the neighborhood places they value most, then visited them together on five walking tours.",
        "TODO: Second paragraph (optional) — how to use the map: pick a walk to follow its route, or browse assets by category."
    ],

    // Headings in the panel
    headings: {
        walks: "Explore by walk",
        categories: "Asset types",
        list: "All assets",
        searchPlaceholder: "Search assets"
    },

    // Map layer names (the on/off switches in the panel)
    layers: {
        heading: "Map layers",
        walkRoutes: "Walk routes",
        ibx: "IBX line & stations"
    },

    // Shown when someone clicks the IBX line on the map.
    // TODO: confirm or edit the description.
    ibx: {
        name: "Interborough Express (IBX)",
        description: "Proposed light rail line connecting Brooklyn and Queens, ending at Roosevelt Avenue in Elmhurst / Jackson Heights."
    },

    // Shown at the bottom of the panel
    credits: "Map: Municipal Art Society of New York, Livable Neighborhoods Program. Asset categories follow the Asset-Based Community Development (ABCD) framework.",


    // --------------------------------------------------------
    // WALKS
    // "number" must match the numbers in the data's Walks field.
    // "letter" is what the map shows instead of the number.
    // Fill in name, theme and date (leave "" to hide a line).
    // --------------------------------------------------------

    walks: [
        { number: 1, letter: "A", name: "TODO: Walk A name", theme: "TODO: theme", date: "TODO: date" },
        { number: 2, letter: "B", name: "TODO: Walk B name", theme: "TODO: theme", date: "TODO: date" },
        { number: 3, letter: "C", name: "TODO: Walk C name", theme: "TODO: theme", date: "TODO: date" },
        { number: 4, letter: "D", name: "TODO: Walk D name", theme: "TODO: theme", date: "TODO: date" },
        { number: 5, letter: "E", name: "TODO: Walk E name", theme: "TODO: theme", date: "TODO: date" }
    ]
};
