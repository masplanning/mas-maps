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

    summary: [
        "Jackson Heights and Elmhurst are among the most culturally diverse neighborhoods in New York, and they sit at the northern end of the proposed Interborough Express (IBX) light rail line. Major transit investments like the IBX shape how neighborhoods grow and change. Yet the places residents value most, like the diner where neighbors catch up or the plaza that hosts the summer festival, rarely appear in the data planners use. MAS invited neighbors to put those places on the map.",
        "In October 2026, residents, organizers, community board members and cultural stewards gathered with MAS to learn cultural asset mapping, a method that starts with what a neighborhood already has rather than what it lacks. Then, five small groups each designed walks to the places that matter most to them and guided fellow participants along the route: restaurants and corner businesses, houses of worship, libraries, plazas and play streets. Each of these sites holds the stories, traditions and relationships that give these neighborhoods their identity.",
        "The walks were part of MAS’s Livable Neighborhoods Program, which gives residents the tools and training to take part in shaping their neighborhoods’ future. This year’s program focused on cultural asset mapping and its role in planning, so that residents’ knowledge of their own neighborhoods shapes decisions about land use, housing and capital investment."
    ],

    // Small line shown under the summary ("" to hide)
    sponsor: "Co-sponsored by the Office of Council Member Shekar Krishnan.",

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
        { number: 1, letter: "A", name: "Walk A route", theme: "", date: "October 24, 2026" },
        { number: 2, letter: "B", name: "Walk B route", theme: "", date: "October 24, 2026" },
        { number: 3, letter: "C", name: "Walk C route", theme: "", date: "October 24, 2026" },
        { number: 4, letter: "D", name: "Walk D route", theme: "", date: "October 24, 2026" },
        { number: 5, letter: "E", name: "Walk E route", theme: "", date: "October 24, 2026" }
    ]
};
