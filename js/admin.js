// Dryzec Baby Pool admin
(function () {
  const API = window.BabyAPI, $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtWeight = (oz) => `${Math.floor(oz / 16)} lb ${oz % 16} oz`;
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
    $("#list").innerHTML = g.length ? g.map((x) => `<div class="arow"><div><b>${esc(x.guesser)}</b>: ${esc(x.baby_name)}
      <small>${x.gender} · ${fmtWeight(x.weight_oz)} · ${Number(x.length_in)} in · ${x.birth_date} · ${x.birth_time}</small></div>
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
