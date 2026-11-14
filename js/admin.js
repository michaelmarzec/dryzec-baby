// Dryzec Baby Pool admin
(function () {
  const API = window.BabyAPI, $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtWeight = (oz) => `${Math.floor(oz / 16)} lb ${oz % 16} oz`;
  const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtTime = (t) => { const [h, m] = String(t).split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
  function renderStats(st) {
    const n = st.count;
    if (!n) { $("#stats").innerHTML = ""; return; }
    const gp = Math.round((st.girls / n) * 100);
    $("#stats").innerHTML = `
      <div class="stat wide"><small>Girl or boy</small>
        <div class="split-legend"><span>Girl ${gp}% (${st.girls})</span><span>Boy ${100 - gp}% (${st.boys})</span></div>
        <div class="split" aria-hidden="true"><i style="width:${gp}%;background:var(--pink)"></i><i style="width:${100 - gp}%;background:var(--blue)"></i></div></div>
      <div class="stat"><small>Average weight</small><b class="num">${fmtWeight(st.avg_weight_oz)}</b></div>
      <div class="stat"><small>Average length</small><b class="num">${st.avg_length_in} in</b></div>
      <div class="stat"><small>Middle birthday</small><b>${fmtDate(st.median_date)}</b></div>
      <div class="stat"><small>Average birth time</small><b class="num">${fmtTime(st.avg_time)}</b></div>
      <div class="stat wide"><small>Most-guessed names</small>
        <div class="names">${st.top_names.map((x) => `<span>${esc(x.name)}${x.c > 1 ? ` <em>×${x.c}</em>` : ""}</span>`).join("")}</div></div>`;
  }
  let pw = null, board = null, tt;
  const toast = (m) => { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => (t.hidden = true), 2200); };

  $("#gate").addEventListener("submit", async (e) => {
    e.preventDefault(); $("#gErr").textContent = "";
    try { board = await API.adminBoard($("#apw").value); pw = $("#apw").value; $("#gate").hidden = true; $("#panel").hidden = false; render(); }
    catch (err) { $("#gErr").textContent = err.message; }
  });
  $("#reload").addEventListener("click", async () => { board = await API.adminBoard(pw); render(); toast("Refreshed"); });

  function render() {
    const g = board.guesses;
    $("#count").textContent = `${g.length} ${g.length === 1 ? "guess" : "guesses"}`;
    renderStats(board.stats);
    $("#list").innerHTML = g.length ? g.map((x) => `<div class="arow"><div><b>${esc(x.guesser)}</b>: ${esc(x.baby_name)}
      <small>${x.gender} · ${fmtWeight(x.weight_oz)} · ${Number(x.length_in)} in · ${fmtDate(x.birth_date)} · ${fmtTime(x.birth_time)}</small></div>
      <button class="del" data-id="${x.id}" type="button">Remove</button></div>`).join("") : `<div class="empty">No guesses yet.</div>`;
    document.querySelectorAll(".del").forEach((b) => b.addEventListener("click", async () => {
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Tap again"; setTimeout(() => { b.classList.remove("armed"); b.textContent = "Remove"; }, 3000); return; }
      try { board = await API.adminDelete(pw, Number(b.dataset.id)); render(); toast("Removed"); } catch (err) { toast(err.message); }
    }));
  }

  $("#copy").addEventListener("click", async () => {
    const rows = [["Guessed by", "Baby name", "Gender", "Weight (lb)", "Weight (oz)", "Length (in)", "Birthday", "Birth time"],
      ...board.guesses.map((x) => [x.guesser, x.baby_name, x.gender, Math.floor(x.weight_oz / 16), x.weight_oz % 16, Number(x.length_in), x.birth_date, x.birth_time])];
    const tsv = rows.map((r) => r.join("\t")).join("\n");
    try { await navigator.clipboard.writeText(tsv); toast("Copied. Paste into Google Sheets."); }
    catch (e) { toast("Couldn't copy on this browser."); }
  });
})();
