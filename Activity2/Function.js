const API_BASE = "https://content.guardianapis.com/search";
const API_KEY  = "test"; 

// replace with your own for higher limits
const PAGE_SIZE = 7;


// App state: current query, section, page, total pages, and loading flag
const state = { q: "", section: "", page: 1, pages: 1, loading: false };
//The q checks the state of the input box for the query function
//The section checks the state of the drop-down menu whether a category is selected or not
//The page is in 1, concatinating whenever next button is triggered
//The pages is the actual number of pages that can be navigated through
  
//state.page must reset when changing search filters because the list of items that
//are ranked in newest is different for every category.

// LocalStorage helpers for bookmarks
const LS_KEY = "gn_bookmarks";
function loadBookmarks() {
    try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]")); }
    catch { return new Set(); }
}

function saveBookmarks(set) {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(set)));
}

state.bookmarks = loadBookmarks();


// Elements
const el = {
    news: document.getElementById("news"),
    status: document.getElementById("status"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next"),
    pageInfo: document.getElementById("pageInfo"),
    q: document.getElementById("q"),
    section: document.getElementById("section"),
    refresh: document.getElementById("refresh"),
    showSummaries: document.getElementById("showSummaries"), // used in Part 9
};


// Build the request URL from state (query, section, page)
function buildUrl() {
    const params = new URLSearchParams({
        "api-key": API_KEY,
        "page-size": PAGE_SIZE.toString(),
        "page": state.page.toString(),
        "order-by": "newest",
        // add your code here: if summaries are toggled on, include trailText
        "show-fields": (el.showSummaries && el.showSummaries.checked)? "thumbnail,trailText":"thumbnail",
    });
    
    if (state.q) params.set("q", state.q);
    if (state.section) params.set("section", state.section);
    return `${API_BASE}?${params.toString()}`;
}
//buildUrl is where the content from the Guardian API is actually fetched and indexed
//for displaying which is handled in fetchNews. buildUrl is the bridge where content
//is summoned from the API to the site.

// 2) Wrap original render to show summaries and star button
function render(results){
    el.news.innerHTML = results.length ? "" : "<p>No results.</p>";
    results.forEach(item => {
        const img = (item.fields && item.fields.thumbnail) || "https://via.placeholder.com/120x80?text=No+Image";
        const summary = (item.fields && item.fields.trailText)
            ? item.fields.trailText.replace(/<[^>]*>/g,"") : "";
        const id = item.id; // unique Guardian content id
        const isSaved = state.bookmarks.has(id);


        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
      <img src="${img}" alt="">
      <div>
        <div style="display:flex;align-items:center;gap:4px;">
          <a href="${item.webUrl}" target="_blank">${item.webTitle}</a>
          <button class="star" data-id="${id}" aria-label="bookmark">${isSaved ? "★" : "☆"}</button>
        </div>
        <div class="muted">${item.sectionName || "News"}</div>
        ${ (el.showSummaries && el.showSummaries.checked && summary)
            ? `<div class="muted">${summary}</div>` : "" }
      </div>
    `;
        el.news.appendChild(card);
    });

    // Star button handlers (toggle bookmark)
    el.news.querySelectorAll(".star").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            // add your code here: toggle bookmark state and persist
            if (state.bookmarks.has(id)) {
                state.bookmarks.delete(id);           // remove bookmark
            } else {
                state.bookmarks.add(id);              // add bookmark
            }
            saveBookmarks(state.bookmarks);         // persist in localStorage
            btn.textContent = state.bookmarks.has(id) ? "★" : "☆"; // update UI
        });
    });

    // Pagination UI
    el.prev.disabled = state.page <= 1;
    el.next.disabled = state.page >= state.pages;
    el.pageInfo.textContent = `Page ${state.page} of ${state.pages}`;
  }

// 3) React to summaries checkbox changes
if (el.showSummaries) {
    el.showSummaries.addEventListener("change", () => {
        state.page = 1;
        // add your code here: refetch so that trailText is included/removed
        fetchNews();
    });
}



function showErrorRetry() {
    el.news.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = "Failed to load. ";
    const b = document.createElement("button");
    b.textContent = "Retry";
    b.onclick = fetchNews;
    p.appendChild(b);
    el.news.appendChild(p);
  }

async function fetchNews() {
    if (state.loading) return;
    state.loading = true;
    el.status.textContent = "Loading...";
    el.news.innerHTML = "";

    try {
        const res = await fetch(buildUrl());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rsp = data.response || {};
        state.pages = rsp.pages || 1;
        render(rsp.results || []);
        el.status.textContent = (rsp.total || 0) + " result(s)";
    } catch (e) {
        console.error(e);
        el.status.textContent = "Failed to load. Try again.";
        showErrorRetry();
    } finally {
        state.loading = false;
    }
}

function findQuery(){
el.q.addEventListener("keydown", (e) => {
if (e.key === "Enter") {
        state.q = el.q.value.trim(); // reset to page 1 on new search
        state.page = 1;
        fetchNews();
        }
    });
}

function dropDowns(){
el.section.addEventListener("change", () => {
        state.section = el.section.value; // reset to page 1 on filter change
        state.page = 1;
        fetchNews().then(r => {});
    });
}

function previous(){
el.prev.addEventListener("click", () => {
        if (state.page > 1) { state.page--; fetchNews().then(r => {}); }
    });
}

function next(){
el.next.addEventListener("click", () => {
        if (state.page < state.pages) { state.page++; fetchNews().then(r => {}); }
    });
}


// Initial load
fetchNews();