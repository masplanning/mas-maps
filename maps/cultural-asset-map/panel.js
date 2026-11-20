// ============================================================
// SIDE PANEL / BOTTOM SHEET (this map only)
// ============================================================
//
// Builds the panel next to the map: title and summary, stats,
// walk filter, asset types (legend + filter), searchable list,
// and info cards. On phones (< 900px wide) the panel becomes a
// bottom sheet that can be pulled up and down.
//
// Words come from content.js; map behavior from config.js
// (window.camMap). Nothing here needs editing for copy changes.
// ============================================================

(function () {

    const CONTENT = window.CAM_CONTENT || {};
    const api = window.camMap;

    const mobileQuery = window.matchMedia("(max-width: 899.98px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Optional fields for info cards. If a column with one of
    // these names is added to the data later, it shows up on the
    // card automatically (empty values are skipped).
    const CARD_FIELDS = {
        address: ["Address", "address", "ADDRESS"],
        description: ["Description", "description", "DESCRIPTION"],
        quote: ["Quote", "quote", "QUOTE"],
        photo: ["PhotoURL", "Photo URL", "Photo_URL", "Photo", "photo_url", "PHOTO_URL"]
    };

    const state = {
        assets: [],
        walk: null,
        categories: new Set(api.categories.map((c) => c.value)),
        search: "",
        matches: new Set(),
        selected: null,
        view: "main",
        listScroll: 0,
        sheet: "peek"
    };


    // ----------------------------------------------------
    // SMALL HELPERS
    // ----------------------------------------------------

    // el("p", { class: "x", text: "Hi" }, [children])
    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([key, value]) => {
            if (value === null || value === undefined || value === false) {
                return;
            }
            if (key === "text") {
                node.textContent = value;
            } else if (key === "class") {
                node.className = value;
            } else if (key.startsWith("on")) {
                node.addEventListener(key.slice(2), value);
            } else {
                node.setAttribute(key, value === true ? "" : value);
            }
        });
        (children || []).forEach((child) => {
            if (child) {
                node.append(child);
            }
        });
        return node;
    }

    function categoryInfo(value) {
        return api.categories.find((c) => c.value === value) ||
            { value, color: "#999999", shape: "circle", key: "other" };
    }

    function symbolCanvas(category, type, scale) {
        const c = categoryInfo(category);
        const canvas = api.drawSymbol(
            c.shape,
            c.color,
            type === "Secondary Stop" ? "outline" : "filled",
            3,
            scale || 0.8
        );
        canvas.setAttribute("aria-hidden", "true");
        canvas.classList.add("cam-symbol");
        return canvas;
    }

    function walkInfo(letter) {
        return api.walks.find((w) => w.letter === letter) || { letter, name: "" };
    }

    // Plain text search: ignores case and accents
    function normalize(text) {
        return String(text || "")
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase();
    }

    function field(props, names) {
        for (const name of names) {
            const value = props[name];
            if (value !== null && value !== undefined && String(value).trim() !== "") {
                return String(value).trim();
            }
        }
        return "";
    }

    let announceTimer = null;
    function announce(message) {
        const live = document.getElementById("cam-live");
        if (!live) {
            return;
        }
        clearTimeout(announceTimer);
        announceTimer = setTimeout(() => {
            live.textContent = message;
        }, 400);
    }


    // ----------------------------------------------------
    // DOM REFERENCES (filled in by build)
    // ----------------------------------------------------

    const ui = {};


    // ----------------------------------------------------
    // BUILD
    // ----------------------------------------------------

    function build() {

        const panel = document.getElementById("cam-panel");
        panel.replaceChildren();
        ui.panel = panel;

        // Drag handle (bottom sheet only)
        ui.handle = el("button", {
            class: "cam-handle",
            type: "button",
            "aria-label": "Expand panel",
            onclick: cycleSheet
        }, [el("span", { class: "cam-handle-bar", "aria-hidden": "true" })]);

        ui.scroll = el("div", { class: "cam-scroll" });
        ui.main = el("div", { class: "cam-view cam-view-main" });
        ui.card = el("div", { class: "cam-view cam-view-card", hidden: true });

        ui.scroll.append(ui.main, ui.card);
        panel.append(ui.handle, ui.scroll);

        // ---- Header
        const logo = CONTENT.logo
            ? el("img", {
                class: "cam-logo-img",
                src: CONTENT.logo,
                alt: CONTENT.organization || "MAS"
            })
            : null;

        const brand = logo
            ? el("div", { class: "cam-brand" }, [
                CONTENT.logoLink
                    ? el("a", {
                        class: "cam-logo-link",
                        href: CONTENT.logoLink,
                        target: "_blank",
                        rel: "noopener"
                    }, [logo])
                    : logo
            ])
            : el("div", { class: "cam-brand" }, [
                el("span", { class: "cam-logo", "aria-hidden": "true", text: CONTENT.organizationShort || "MAS" }),
                el("span", { class: "cam-org", text: CONTENT.organization || "" })
            ]);

        const header = el("header", { class: "cam-head" }, [
            brand,
            el("p", { class: "cam-eyebrow", text: CONTENT.eyebrow }),
            el("h1", { class: "cam-title", text: CONTENT.title })
        ]);

        // ---- Stats (computed from the data)
        const walkLetters = new Set(state.assets.flatMap((a) => a.walks));
        ui.stats = el("dl", { class: "cam-stats" }, [
            stat(state.assets.length, "Assets"),
            stat(walkLetters.size, "Walks")
        ]);

        // ---- Summary
        const summary = el("div", { class: "cam-summary" },
            (CONTENT.summary || []).map((text) => el("p", { text })));

        // ---- Walks
        ui.panelChips = buildWalkChips("cam-chips");
        ui.walkInfo = el("div", { class: "cam-walk-info", hidden: true });
        const walksSection = el("section", { class: "cam-section cam-walks", "aria-labelledby": "cam-walks-h" }, [
            el("h2", { id: "cam-walks-h", text: (CONTENT.headings || {}).walks || "Explore by walk" }),
            ui.panelChips,
            ui.walkInfo
        ]);

        // ---- Asset types (legend + filter)
        ui.categoryButtons = api.categories.map((c) => {
            const count = state.assets.filter((a) => a.category === c.value).length;
            return el("button", {
                class: "cam-cat",
                type: "button",
                "aria-pressed": "true",
                "data-category": c.value,
                onclick: () => toggleCategory(c.value)
            }, [
                symbolCanvas(c.value, "Primary Stop", 0.8),
                el("span", { class: "cam-cat-label", text: c.value }),
                el("span", { class: "cam-cat-count", text: String(count) }),
                el("span", { class: "cam-cat-check", "aria-hidden": "true" })
            ]);
        });

        const key = el("ul", { class: "cam-key", "aria-label": "Symbol key" }, [
            el("li", {}, [
                symbolCanvas("Culture & Heritage", "Primary Stop", 0.7),
                el("span", { text: "Primary stop (filled)" })
            ]),
            el("li", {}, [
                symbolCanvas("Culture & Heritage", "Secondary Stop", 0.85),
                el("span", { text: "Secondary stop (outline)" })
            ]),
            el("li", {}, [
                badgeCanvas(2),
                el("span", { text: "Seen on 2 or more walks (number of walks)" })
            ])
        ]);

        ui.areaKey = el("div", { class: "cam-areas", hidden: true });

        const categoriesSection = el("section", { class: "cam-section", "aria-labelledby": "cam-cats-h" }, [
            el("h2", { id: "cam-cats-h", text: (CONTENT.headings || {}).categories || "Asset types" }),
            el("p", { class: "cam-hint", text: "Select a type to show or hide it." }),
            el("div", { class: "cam-cats", role: "group", "aria-labelledby": "cam-cats-h" }, ui.categoryButtons),
            key,
            ui.areaKey
        ]);

        // ---- List
        ui.count = el("p", { class: "cam-count", id: "cam-count" });
        ui.searchInput = el("input", {
            class: "cam-search",
            id: "cam-search",
            type: "search",
            placeholder: (CONTENT.headings || {}).searchPlaceholder || "Search assets",
            autocomplete: "off",
            "aria-describedby": "cam-count",
            oninput: (e) => {
                state.search = e.target.value;
                updateList();
                announce(listAnnouncement());
            }
        });
        ui.empty = el("p", { class: "cam-empty", hidden: true, text: "No assets match these filters." });
        ui.list = el("div", { class: "cam-list" });
        ui.items = new Map();
        ui.groups = [];

        api.categories.forEach((c) => {
            const assets = state.assets
                .filter((a) => a.category === c.value)
                .sort((a, b) => a.name.localeCompare(b.name));
            if (!assets.length) {
                return;
            }
            const countSpan = el("span", { class: "cam-group-count" });
            const ul = el("ul", { class: "cam-items" });
            assets.forEach((asset) => {
                const button = el("button", {
                    class: "cam-item",
                    type: "button",
                    "data-id": String(asset.id),
                    onclick: () => openCard(asset.id, { fly: true }),
                    onmouseenter: () => api.setHighlight(asset.id),
                    onmouseleave: () => api.setHighlight(null),
                    onfocus: () => api.setHighlight(asset.id),
                    onblur: () => api.setHighlight(null)
                }, [
                    symbolCanvas(asset.category, asset.type, 0.7),
                    el("span", { class: "cam-item-name", text: asset.name }),
                    el("span", {
                        class: "cam-item-walks",
                        text: asset.walks.join(" · "),
                        "aria-label": `Walks ${asset.walks.join(", ")}`
                    })
                ]);
                const li = el("li", {}, [button]);
                ui.items.set(asset.id, { li, button, asset });
                ul.append(li);
            });
            const group = el("div", { class: "cam-group" }, [
                el("h3", {}, [el("span", { text: c.value }), " ", countSpan]),
                ul
            ]);
            ui.groups.push({ group, countSpan, category: c.value });
            ui.list.append(group);
        });

        const listSection = el("section", { class: "cam-section", "aria-labelledby": "cam-list-h" }, [
            el("h2", { id: "cam-list-h", text: (CONTENT.headings || {}).list || "All assets" }),
            el("label", { class: "cam-sr-only", for: "cam-search", text: "Search assets by name" }),
            ui.searchInput,
            ui.count,
            ui.empty,
            ui.list
        ]);

        const footer = el("footer", { class: "cam-foot", text: CONTENT.credits });

        ui.head = header;
        ui.main.append(header, ui.stats, summary, walksSection, categoriesSection, listSection, footer);

        // ---- Walk chips over the map (phones)
        const walkbar = document.getElementById("cam-walkbar");
        ui.barChips = buildWalkChips("cam-chips cam-chips-bar");
        walkbar.replaceChildren(ui.barChips);
    }

    function stat(value, label) {
        return el("div", { class: "cam-stat" }, [
            el("dt", { text: label }),
            el("dd", { text: String(value) })
        ]);
    }

    function badgeCanvas(count) {
        const canvas = api.drawBadge(count, 3);
        canvas.style.width = `${canvas.width / 3}px`;
        canvas.style.height = `${canvas.height / 3}px`;
        canvas.setAttribute("aria-hidden", "true");
        canvas.classList.add("cam-badge");
        return canvas;
    }

    function buildWalkChips(className) {
        const options = [{ letter: null, label: "All" }]
            .concat(api.walks
                .filter((w) => state.assets.some((a) => a.walks.includes(w.letter)))
                .map((w) => ({ letter: w.letter, label: w.letter })));

        return el("div", { class: className, role: "group", "aria-label": "Filter by walk" },
            options.map((o) => {
                const walk = o.letter ? walkInfo(o.letter) : null;
                const fullName = walk && walk.name && !/^TODO/i.test(walk.name)
                    ? `Walk ${o.letter}: ${walk.name}`
                    : (o.letter ? `Walk ${o.letter}` : "All walks");
                return el("button", {
                    class: "cam-chip",
                    type: "button",
                    "data-walk": o.letter || "",
                    "aria-pressed": o.letter === null ? "true" : "false",
                    "aria-label": fullName,
                    title: fullName,
                    onclick: () => setWalk(o.letter)
                }, [o.letter ? el("span", { class: "cam-chip-prefix", "aria-hidden": "true", text: "Walk " }) : null, o.label]);
            }));
    }


    // ----------------------------------------------------
    // FILTERS
    // ----------------------------------------------------

    function setWalk(letter) {
        state.walk = letter || null;
        applyFilters();

        // Fit to the walk's stops (or everything for "All")
        const ids = state.walk
            ? state.assets
                .filter((a) => a.walks.includes(state.walk) && state.categories.has(a.category))
                .map((a) => a.id)
            : [...state.matches];
        api.fitToIds(ids, { walk: state.walk });

        announce(filterAnnouncement());
    }

    function toggleCategory(value) {
        if (state.categories.has(value)) {
            state.categories.delete(value);
        } else {
            state.categories.add(value);
        }
        applyFilters();
        announce(filterAnnouncement());
    }

    function applyFilters() {

        const matches = api.applyFilters({
            walk: state.walk,
            categories: [...state.categories]
        });
        state.matches = new Set(matches);

        // Chips (panel + map bar + card)
        document.querySelectorAll(".cam-chip").forEach((chip) => {
            const letter = chip.dataset.walk || null;
            chip.setAttribute("aria-pressed", String(letter === state.walk));
        });

        // Category buttons
        ui.categoryButtons.forEach((button) => {
            button.setAttribute("aria-pressed",
                String(state.categories.has(button.dataset.category)));
        });

        // Walk details
        if (state.walk) {
            const w = walkInfo(state.walk);
            const lines = [w.theme, w.date].filter((t) => t && String(t).trim());
            ui.walkInfo.replaceChildren(
                el("p", { class: "cam-walk-name" }, [
                    el("span", { class: "cam-walk-letter", text: w.letter }),
                    el("span", { text: w.name || `Walk ${w.letter}` })
                ]),
                lines.length ? el("p", { class: "cam-walk-meta", text: lines.join(" · ") }) : null
            );
            ui.walkInfo.hidden = false;
        } else {
            ui.walkInfo.hidden = true;
        }

        updateList();

        // Card chips reflect the current walk too
        if (state.view === "card" && state.selected !== null) {
            ui.card.querySelectorAll(".cam-chip").forEach((chip) => {
                chip.setAttribute("aria-pressed", String(chip.dataset.walk === state.walk));
            });
        }
    }

    function updateList() {

        const query = normalize(state.search.trim());
        let shown = 0;

        ui.items.forEach(({ li, asset }) => {
            const visible = state.matches.has(asset.id) &&
                (!query || normalize(asset.name).includes(query));
            li.hidden = !visible;
            if (visible) {
                shown++;
            }
        });

        ui.groups.forEach(({ group, countSpan, category }) => {
            const n = [...ui.items.values()]
                .filter(({ li, asset }) => asset.category === category && !li.hidden).length;
            countSpan.textContent = `(${n})`;
            group.hidden = n === 0;
        });

        ui.empty.hidden = shown > 0;

        const total = state.assets.length;
        const base = `Showing ${state.matches.size} of ${total} assets`;
        ui.count.textContent = query ? `${base} · ${shown} match “${state.search.trim()}”` : base;
        state.shownInList = shown;
    }

    function filterAnnouncement() {
        const parts = [`Showing ${state.matches.size} of ${state.assets.length} assets`];
        if (state.walk) {
            const w = walkInfo(state.walk);
            parts.push(`on walk ${state.walk}${w.name && !/^TODO/i.test(w.name) ? `, ${w.name}` : ""}`);
        }
        const hidden = api.categories.filter((c) => !state.categories.has(c.value)).map((c) => c.value);
        if (hidden.length) {
            parts.push(`hiding ${hidden.join(", ")}`);
        }
        return parts.join(", ") + ".";
    }

    function listAnnouncement() {
        return state.search.trim()
            ? `${state.shownInList} assets match “${state.search.trim()}”.`
            : filterAnnouncement();
    }


    // ----------------------------------------------------
    // INFO CARDS
    // ----------------------------------------------------

    function setView(view) {
        state.view = view;
        ui.main.hidden = view !== "main";
        ui.card.hidden = view !== "card";
    }

    function openCard(id, options) {

        const item = ui.items.get(id);
        if (!item) {
            return;
        }
        const asset = item.asset;
        const p = asset.properties;
        const c = categoryInfo(asset.category);

        if (state.view === "main") {
            state.listScroll = ui.scroll.scrollTop;
        }

        state.selected = id;
        api.select(id);
        markSelected(id);

        const photo = field(p, CARD_FIELDS.photo);
        const address = field(p, CARD_FIELDS.address);
        const description = field(p, CARD_FIELDS.description);
        const quote = field(p, CARD_FIELDS.quote);
        const safePhoto = /^https?:\/\//i.test(photo) ? photo : "";

        const heading = el("h2", { class: "cam-card-title", tabindex: "-1", text: asset.name });

        const walkChips = el("div", { class: "cam-card-walks" }, [
            el("span", { class: "cam-card-label", text: "Seen on walks:" }),
            el("div", { class: "cam-chips cam-chips-small", role: "group", "aria-label": "Show this walk" },
                asset.walks.map((letter, i) => {
                    const w = walkInfo(letter);
                    const label = w.name && !/^TODO/i.test(w.name)
                        ? `Show walk ${letter}: ${w.name}`
                        : `Show walk ${letter}`;
                    return [
                        i > 0 ? el("span", { class: "cam-dot", "aria-hidden": "true", text: "·" }) : null,
                        el("button", {
                            class: "cam-chip",
                            type: "button",
                            "data-walk": letter,
                            "aria-pressed": String(state.walk === letter),
                            "aria-label": label,
                            title: label,
                            onclick: () => setWalk(letter)
                        }, [letter])
                    ];
                }).flat())
        ]);

        ui.card.replaceChildren(
            el("button", { class: "cam-back", type: "button", onclick: closeCard }, [
                el("span", { "aria-hidden": "true", text: "← " }), "Back to all assets"
            ]),
            el("article", { class: "cam-card", "aria-labelledby": "cam-card-title" }, [
                safePhoto ? el("img", { class: "cam-card-photo", src: safePhoto, alt: "", loading: "lazy" }) : null,
                el("div", { class: "cam-card-tags" }, [
                    el("span", { class: "cam-tag", style: `--tag-color: ${c.color}` }, [
                        symbolCanvas(asset.category, asset.type, 0.65),
                        el("span", { text: asset.category })
                    ]),
                    el("span", { class: "cam-type", text: asset.type === "Secondary Stop" ? "Secondary stop" : "Primary stop" })
                ]),
                Object.assign(heading, { id: "cam-card-title" }),
                address ? el("p", { class: "cam-card-address", text: address }) : null,
                description ? el("p", { class: "cam-card-desc", text: description }) : null,
                quote ? el("blockquote", { class: "cam-card-quote", text: quote }) : null,
                asset.walks.length ? walkChips : null
            ])
        );

        setView("card");
        ui.scroll.scrollTop = 0;

        if (mobileQuery.matches && state.sheet === "peek") {
            setSheet("half");
        }

        if (options && options.fly) {
            api.flyTo(id);
        }

        heading.focus({ preventScroll: true });
    }

    function openAreaCard(area) {

        if (state.view === "main") {
            state.listScroll = ui.scroll.scrollTop;
        }
        state.selected = null;
        api.select(null);
        markSelected(null);

        const p = area.properties || {};
        const heading = el("h2", { class: "cam-card-title", tabindex: "-1", text: area.title || p.Name || area.kind });

        ui.card.replaceChildren(
            el("button", { class: "cam-back", type: "button", onclick: closeCard }, [
                el("span", { "aria-hidden": "true", text: "← " }), "Back to all assets"
            ]),
            el("article", { class: "cam-card" }, [
                el("div", { class: "cam-card-tags" }, [
                    el("span", { class: "cam-type", text: area.kind })
                ]),
                heading,
                p.Description ? el("p", { class: "cam-card-desc", text: p.Description }) : null
            ])
        );

        setView("card");
        ui.scroll.scrollTop = 0;
        if (mobileQuery.matches && state.sheet === "peek") {
            setSheet("half");
        }
        heading.focus({ preventScroll: true });
    }

    function closeCard() {

        const id = state.selected;
        state.selected = null;
        api.select(null);
        setView("main");
        ui.scroll.scrollTop = state.listScroll;

        const item = id !== null ? ui.items.get(id) : null;
        if (item && !item.li.hidden) {
            item.button.focus({ preventScroll: true });
            item.button.scrollIntoView({ block: "nearest" });
        }
        markSelected(null);
    }

    function markSelected(id) {
        ui.items.forEach(({ button }, itemId) => {
            button.classList.toggle("is-selected", itemId === id);
            if (itemId === id) {
                button.setAttribute("aria-current", "true");
            } else {
                button.removeAttribute("aria-current");
            }
        });
    }


    // ----------------------------------------------------
    // BOTTOM SHEET (phones)
    // ----------------------------------------------------

    function sheetHeights() {
        const panelHeight = ui.panel.offsetHeight;
        const handle = ui.handle.offsetHeight;
        // Peek: handle + title + stats
        // (measured while the main view is showing, then reused)
        if (!ui.main.hidden && ui.stats.offsetHeight) {
            const statsBottom = ui.stats.offsetTop + ui.stats.offsetHeight;
            ui.peekHeight = statsBottom + 14;
        }
        const peek = Math.min(ui.peekHeight || handle + 140, panelHeight);
        return {
            peek: peek,
            half: Math.max(peek, Math.round(window.innerHeight * 0.5)),
            full: panelHeight
        };
    }

    function setSheet(name, instant) {

        state.sheet = name;

        if (!mobileQuery.matches) {
            ui.panel.style.removeProperty("--sheet-visible");
            document.documentElement.style.removeProperty("--cam-sheet-visible");
            return;
        }

        const heights = sheetHeights();
        applySheetHeight(heights[name], instant);

        ui.panel.dataset.sheet = name;
        ui.handle.setAttribute("aria-label",
            name === "full" ? "Collapse panel" : "Expand panel");
        ui.handle.setAttribute("aria-expanded", String(name !== "peek"));
    }

    function applySheetHeight(px, instant) {
        ui.panel.classList.toggle("is-dragging", !!instant);
        ui.panel.style.setProperty("--sheet-visible", `${px}px`);
        document.documentElement.style.setProperty("--cam-sheet-visible", `${px}px`);
    }

    function cycleSheet() {
        if (ui.dragMoved) {
            ui.dragMoved = false;
            return;
        }
        const order = ["peek", "half", "full"];
        const next = state.sheet === "full" ? "peek" : order[order.indexOf(state.sheet) + 1];
        setSheet(next);
    }

    function setupDrag() {

        let startY = 0;
        let startVisible = 0;
        let dragging = false;

        ui.handle.addEventListener("pointerdown", (e) => {
            if (!mobileQuery.matches) {
                return;
            }
            dragging = true;
            ui.dragMoved = false;
            startY = e.clientY;
            startVisible = sheetHeights()[state.sheet];
            ui.handle.setPointerCapture(e.pointerId);
        });

        ui.handle.addEventListener("pointermove", (e) => {
            if (!dragging) {
                return;
            }
            const dy = e.clientY - startY;
            if (Math.abs(dy) > 6) {
                ui.dragMoved = true;
            }
            if (!ui.dragMoved) {
                return;
            }
            const h = sheetHeights();
            const visible = Math.min(Math.max(startVisible - dy, h.peek), h.full);
            applySheetHeight(visible, true);
        });

        function end(e) {
            if (!dragging) {
                return;
            }
            dragging = false;
            if (!ui.dragMoved) {
                return;   // a tap: the click handler cycles states
            }
            const visible = startVisible - (e.clientY - startY);
            const h = sheetHeights();
            const nearest = ["peek", "half", "full"]
                .map((name) => ({ name, d: Math.abs(h[name] - visible) }))
                .sort((a, b) => a.d - b.d)[0].name;
            setSheet(nearest);
        }

        ui.handle.addEventListener("pointerup", end);
        ui.handle.addEventListener("pointercancel", end);
    }


    // ----------------------------------------------------
    // MAP PADDING (keeps fitted points clear of panel/sheet)
    // ----------------------------------------------------

    function viewPadding() {
        if (mobileQuery.matches) {
            const bar = document.getElementById("cam-walkbar");
            const top = bar ? bar.getBoundingClientRect().bottom + 16 : 40;
            const sheet = state.sheet === "peek"
                ? sheetHeights().peek
                : Math.min(sheetHeights()[state.sheet], window.innerHeight * 0.5);
            return { top, right: 28, bottom: sheet + 20, left: 28 };
        }
        return { top: 60, right: 70, bottom: 50, left: 60 };
    }


    // ----------------------------------------------------
    // START
    // ----------------------------------------------------

    document.addEventListener("DOMContentLoaded", () => {

        if (!api || typeof map === "undefined") {
            return;
        }

        api.getViewPadding = viewPadding;

        api.ready.then(({ assets }) => {

            state.assets = assets;
            build();
            setupDrag();
            applyFilters();
            setSheet("peek", true);

            // Map layers: walk routes, IBX, districts/corridors
            // (only the ones whose files loaded)
            Promise.all([
                api.routesReady || Promise.resolve(api.routes),
                api.areasReady || Promise.resolve(api.areas)
            ]).then(([routes, areas]) => {

                const labels = CONTENT.layers || {};
                const rows = [];

                function toggleRow(id, swatchClass, label, checked, onChange) {
                    return el("label", { class: "cam-toggle", for: id }, [
                        el("input", {
                            type: "checkbox",
                            id,
                            checked,
                            onchange: (e) => {
                                onChange(e.target.checked);
                                announce(`${label} ${e.target.checked ? "shown" : "hidden"}.`);
                            }
                        }),
                        el("span", { class: `cam-swatch ${swatchClass}`, "aria-hidden": "true" }),
                        el("span", { text: label })
                    ]);
                }

                if (routes && routes.walks) {
                    rows.push(toggleRow("cam-walks-toggle", "cam-swatch-walk",
                        labels.walkRoutes || "Walk routes", true,
                        (on) => api.setRoutesVisible("walks", on)));
                }
                if (routes && routes.ibx) {
                    rows.push(toggleRow("cam-ibx-toggle", "cam-swatch-ibx",
                        labels.ibx || "IBX line & stations", true,
                        (on) => api.setRoutesVisible("ibx", on)));
                }
                if (areas && areas.available) {
                    const kinds = [areas.districts ? "districts" : null, areas.corridors ? "corridors" : null]
                        .filter(Boolean).join(" & ");
                    rows.push(toggleRow("cam-areas-toggle",
                        areas.districts ? "cam-swatch-district" : "cam-swatch-corridor",
                        labels.areas || kinds.charAt(0).toUpperCase() + kinds.slice(1),
                        api.areaSettings.visibleOnLoad,
                        (on) => api.setAreasVisible(on)));
                }

                if (!rows.length) {
                    return;
                }

                ui.areaKey.replaceChildren(
                    el("h3", { class: "cam-layers-h", text: labels.heading || "Map layers" }),
                    ...rows,
                    routes && routes.walks
                        ? el("p", { class: "cam-hint cam-layers-hint", text: "Pick a walk above to highlight its route." })
                        : null
                );
                ui.areaKey.hidden = false;
            });

            // Starting view: all points, clear of the panel
            requestAnimationFrame(() => api.fitToIds([], { instant: true }));

            // Map -> panel
            api.on("pointclick", (id) => openCard(id, { fly: false }));
            api.on("areaclick", (area) => openAreaCard(area));
            api.on("walkclick", (letter) => setWalk(letter));
            api.on("pointhover", (id) => {
                ui.items.forEach(({ button }, itemId) => {
                    button.classList.toggle("is-hover", itemId === id);
                });
                const item = id !== null ? ui.items.get(id) : null;
                if (item && state.view === "main" && !item.li.hidden && !mobileQuery.matches) {
                    item.button.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
                }
            });

            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && state.view === "card") {
                    closeCard();
                }
            });

            mobileQuery.addEventListener("change", () => setSheet(state.sheet === "peek" ? "peek" : "half", true));
            window.addEventListener("resize", () => setSheet(state.sheet, true));
        });
    });

})();
