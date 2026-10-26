(() => {
  "use strict";

  const REFRESH_MS = 60_000;
  const CACHE_KEY = "cecms:last-status";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = { centers: [], filter: "all", query: "" };

  // ---------- Helpers ----------
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);
  }

  const fmt = (n) => Number(n || 0).toLocaleString("en-PH");

  function timeAgo(iso) {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (!Number.isFinite(mins)) return "";
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    return hrs < 24 ? `${hrs} hr ago` : new Date(iso).toLocaleString("en-PH");
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
  }

  // ---------- Rendering ----------
  function renderSummary(data, { offline = false } = {}) {
    const s = data.summary;
    $("#stat-open").textContent = fmt(s.openCenters);
    $("#stat-available").textContent = fmt(s.availableSpaces);
    $("#stat-evacuees").textContent = fmt(s.evacuees);
    $("#stat-total").textContent = fmt(s.totalCenters);

    const badge = $("#source-badge");
    badge.classList.toggle("is-live", data.source === "sheet" && !offline);
    badge.textContent = offline ? "Offline copy" : data.source === "sheet" ? "Live" : "Sample data";

    $("#board-updated").textContent = offline
      ? `No connection. Showing data saved ${timeAgo(data.fetchedAt)}.`
      : `Updated ${timeAgo(data.fetchedAt)}. Refreshes every minute.`;
  }

  function centerCard(c) {
    const pct = c.capacity ? Math.min(100, Math.round((c.occupancy / c.capacity) * 100)) : 0;
    const contact = [
      c.contactPerson && `<span>${escapeHtml(c.contactPerson)}</span>`,
      c.contactNumber && `<a href="tel:${escapeHtml(c.contactNumber.replace(/[^\d+]/g, ""))}">${escapeHtml(c.contactNumber)}</a>`,
      c.lastUpdated && `<span>Updated ${escapeHtml(c.lastUpdated)}</span>`,
    ].filter(Boolean).join("");

    return `
      <article class="center-card" data-status="${escapeHtml(c.status)}">
        <div class="center-top">
          <div>
            <h3>${escapeHtml(c.name)}</h3>
            ${c.location ? `<p class="center-loc">${escapeHtml(c.location)}</p>` : ""}
          </div>
          <span class="status-pill">${escapeHtml(c.status)}</span>
        </div>
        <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${c.capacity}" aria-valuenow="${c.occupancy}"
             aria-label="${escapeHtml(c.name)} occupancy ${pct}%"><span style="width:${pct}%"></span></div>
        <div class="center-numbers">
          <span><strong>${fmt(c.occupancy)}</strong> / ${fmt(c.capacity)} occupied</span>
          <span><strong>${c.status === "Closed" ? 0 : fmt(c.available)}</strong> spaces left</span>
        </div>
        ${contact ? `<div class="center-meta">${contact}</div>` : ""}
      </article>`;
  }

  function renderCenters() {
    const q = state.query.trim().toLowerCase();
    const list = state.centers.filter((c) =>
      (state.filter === "all" || c.status === state.filter) &&
      (!q || `${c.name} ${c.location}`.toLowerCase().includes(q))
    );
    $("#center-grid").innerHTML = list.map(centerCard).join("");
    $("#center-empty").hidden = list.length > 0;
  }

  function renderAnnouncements(items) {
    const box = $("#announcement-list");
    if (!items.length) {
      box.innerHTML = `<p class="empty">No active announcements right now.</p>`;
      $("#alert-strip").hidden = true;
      return;
    }
    box.innerHTML = items.map((a) => `
      <article class="announcement" data-priority="${escapeHtml(a.priority)}">
        <div class="announcement-top">
          <span class="prio-tag">${escapeHtml(a.priority)}</span>
          ${a.postedAt ? `<time>${escapeHtml(a.postedAt)}</time>` : ""}
        </div>
        <h3>${escapeHtml(a.title)}</h3>
        ${a.message ? `<p>${escapeHtml(a.message)}</p>` : ""}
      </article>`).join("");

    const urgent = items.find((a) => a.priority === "urgent");
    $("#alert-strip").hidden = !urgent;
    if (urgent) $("#alert-text").textContent = urgent.title;
  }

  function renderCenterOptions(centers) {
    const select = $("#preferredCenter");
    const current = select.value;
    select.innerHTML = `<option value="">Any center</option>` + centers
      .map((c) => `<option>${escapeHtml(c.name)}</option>`).join("");
    select.value = current;
  }

  function render(data, opts) {
    state.centers = data.centers;
    renderSummary(data, opts);
    renderCenters();
    renderAnnouncements(data.announcements);
    renderCenterOptions(data.centers);
  }

  // ---------- Data loading ----------
  async function load() {
    try {
      const res = await fetch("/api/status", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      writeCache(data);
      render(data);
    } catch (err) {
      console.warn("Status fetch failed:", err);
      const cached = readCache();
      if (cached) {
        render(cached, { offline: true });
      } else {
        $("#source-badge").textContent = "Unavailable";
        $("#board-updated").textContent = "Couldn't reach the server. Check your connection; we'll retry automatically.";
        $("#center-grid").innerHTML = "";
        $("#center-empty").textContent = "Center data is unavailable right now.";
        $("#center-empty").hidden = false;
        $("#announcement-list").innerHTML = `<p class="empty">Announcements are unavailable right now.</p>`;
      }
    }
  }

  // ---------- Interactions ----------
  $("#center-search").addEventListener("input", (e) => {
    state.query = e.target.value;
    renderCenters();
  });

  $$(".chip").forEach((chip) => chip.addEventListener("click", () => {
    state.filter = chip.dataset.filter;
    $$(".chip").forEach((c) => {
      c.classList.toggle("is-active", c === chip);
      c.setAttribute("aria-pressed", String(c === chip));
    });
    renderCenters();
  }));

  const toggle = $(".nav-toggle");
  const links = $("#nav-links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  // ---------- Volunteer form ----------
  const form = $("#volunteer-form");
  const statusEl = $("#form-status");

  function showFieldErrors(fields = {}) {
    $$(".field-error", form).forEach((el) => {
      const msg = fields[el.dataset.for] || "";
      el.textContent = msg;
      el.closest(".field").classList.toggle("has-error", Boolean(msg));
    });
    const first = Object.keys(fields)[0];
    if (first) form.elements[first]?.focus();
  }

  function clientValidate(values) {
    const errors = {};
    if (values.fullName.trim().length < 2) errors.fullName = "Please enter your full name.";
    if (!/^(09|\+639)\d{9}$/.test(values.contactNumber.replace(/[\s-]/g, ""))) {
      errors.contactNumber = "Use a PH mobile number, e.g. 09171234567.";
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = "That email address doesn't look right.";
    }
    if (!values.availability) errors.availability = "Please choose your availability.";
    return errors;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    statusEl.className = "form-status";
    statusEl.textContent = "";

    const errors = clientValidate(values);
    showFieldErrors(errors);
    if (Object.keys(errors).length) return;

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Sending…";

    try {
      const res = await fetch("/api/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showFieldErrors(data.fields);
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      form.reset();
      statusEl.classList.add("is-success");
      statusEl.textContent = data.demo
        ? "Thanks! (Demo mode: connect the Google Sheet to save sign-ups.)"
        : "Thank you! A barangay coordinator will contact you soon.";
    } catch (err) {
      statusEl.classList.add("is-error");
      statusEl.textContent = err.message;
    } finally {
      button.disabled = false;
      button.textContent = "Sign me up";
    }
  });

  // ---------- Start ----------
  load();
  setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
})();
