// Dryzec Baby Pool
(function () {
  const API = window.BabyAPI, cfg = window.BABY_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MINE = "dryzec-mine";
  let gender = null, mine = null;

  const fmtWeight = (oz) => `${Math.floor(oz / 16)} lb ${oz % 16} oz`;
  const fmtDate = (d, withYear) => new Date(d + "T12:00:00").toLocaleDateString("en-US", withYear ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
  const fmtTime = (t) => { const [h, m] = String(t).split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
  const iso = (n) => { const d = new Date(Date.now() + n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  try { mine = JSON.parse(localStorage.getItem(MINE)); } catch (e) {}
  if (cfg.dueLabel) { $("#due").textContent = cfg.dueLabel; $("#due").hidden = false; }
  $("#bDate").min = iso(-60); $("#bDate").max = iso(400);

  function setGender(g) {
    gender = g;
    document.querySelectorAll(".seg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.g === g));
  }
  document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => setGender(b.dataset.g)));
  ["#wLb", "#wOz"].forEach((s) => $(s).addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "").slice(0, 2))));

  function fill(g) {
    $("#babyName").value = g.baby_name; setGender(g.gender); $("#bDate").value = g.birth_date; $("#bTime").value = g.birth_time;
    $("#wLb").value = Math.floor(g.weight_oz / 16); $("#wOz").value = g.weight_oz % 16; $("#len").value = g.length_in; $("#guesser").value = g.guesser;
  }
  function read() {
    const lb = parseInt($("#wLb").value, 10), oz = parseInt($("#wOz").value || "0", 10), len = parseFloat(String($("#len").value).replace(",", "."));
    const g = { baby_name: $("#babyName").value.trim(), gender, birth_date: $("#bDate").value, birth_time: $("#bTime").value,
      weight_oz: lb * 16 + oz, length_in: len, guesser: $("#guesser").value.trim() };
    if (!g.baby_name) return [null, "Give the baby a name."];
    if (!g.gender) return [null, "Pick girl or boy."];
    if (!g.birth_date) return [null, "Pick a birthday."];
    if (!g.birth_time) return [null, "Pick a birth time."];
    if (!(lb >= 0) || oz > 15 || !(g.weight_oz >= 48 && g.weight_oz <= 192)) return [null, "Weight should be between 3 and 12 lb (ounces 0 to 15)."];
    if (!(len >= 12 && len <= 26)) return [null, "Length should be between 12 and 26 inches."];
    if (!g.guesser) return [null, "Add your name so we know who guessed."];
    return [g, null];
  }

  $("#guessForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const [g, problem] = read(); $("#err").textContent = problem || "";
    if (!g) return;
    const btn = $("#submit"); btn.disabled = true; btn.textContent = "Saving…";
    try {
      const sameName = mine && mine.guesser && mine.guesser.trim().toLowerCase() === g.guesser.toLowerCase();
      const r = await API.submit(g, sameName ? mine.token : null);
      mine = { token: r.token, id: r.id, guesser: g.guesser, guess: g };
      try { localStorage.setItem(MINE, JSON.stringify(mine)); } catch (e2) {}
      showDone(r.board, sameName ? "Guess updated" : "Guess saved");
    } catch (err) { $("#err").textContent = err.message; }
    btn.disabled = false; btn.textContent = mine ? "Update my guess" : "Submit my guess";
  });

  function showDone(board, title) {
    const g = mine.guess;
    $("#guessForm").hidden = true; $("#thanks").hidden = false;
    $("#thanks h2").textContent = title;
    $("#thanksText").textContent = `${g.baby_name}, a ${g.gender}, ${fmtWeight(g.weight_oz)}, ${g.length_in} in, born ${fmtDate(g.birth_date, true)} at ${fmtTime(g.birth_time)}.`;
    renderBoard(board); $("#board").hidden = false;
  }
  $("#editBtn").addEventListener("click", () => {
    fill(mine.guess); $("#submit").textContent = "Update my guess";
    $("#fine").textContent = "Changing your name starts a new guess.";
    $("#thanks").hidden = true; $("#guessForm").hidden = false; $("#babyName").focus();
  });

  function renderBoard(b) {
    const s = b.stats, n = s.count;
    $("#count").textContent = `${n} ${n === 1 ? "guess" : "guesses"}`;
    if (!n) { $("#stats").innerHTML = ""; $("#guesses").innerHTML = `<div class="empty">No guesses yet.</div>`; return; }
    const gp = Math.round((s.girls / n) * 100);
    $("#stats").innerHTML = `
      <div class="stat wide"><small>Girl or boy</small>
        <div class="split-legend"><span>Girl ${gp}%</span><span>Boy ${100 - gp}%</span></div>
        <div class="split" aria-hidden="true"><i style="width:${gp}%;background:var(--pink)"></i><i style="width:${100 - gp}%;background:var(--blue)"></i></div></div>
      <div class="stat"><small>Average weight</small><b class="num">${fmtWeight(s.avg_weight_oz)}</b></div>
      <div class="stat"><small>Average length</small><b class="num">${s.avg_length_in} in</b></div>
      <div class="stat"><small>Middle birthday</small><b>${fmtDate(s.median_date)}</b></div>
      <div class="stat"><small>Average birth time</small><b class="num">${fmtTime(s.avg_time)}</b></div>
      <div class="stat wide"><small>Most-guessed names</small>
        <div class="names">${s.top_names.map((x) => `<span>${esc(x.name)}${x.c > 1 ? ` <em>×${x.c}</em>` : ""}</span>`).join("")}</div></div>`;
    $("#guesses").innerHTML = b.guesses.slice().reverse().map((g) => `
      <div class="g ${g.gender}${mine && g.id === mine.id ? " mine" : ""}">
        <div class="n">${esc(g.baby_name)}</div><div class="who">${mine && g.id === mine.id ? "You" : esc(g.guesser)}</div>
        <div class="facts num">${g.gender === "girl" ? "Girl" : "Boy"} · ${fmtWeight(g.weight_oz)} · ${Number(g.length_in)} in · ${fmtDate(g.birth_date)} · ${fmtTime(g.birth_time)}</div>
      </div>`).join("");
  }

  let tt;
  window.babyToast = (m) => { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => (t.hidden = true), 2200); };

  // returning guest: show their guess and the board, keep it fresh
  async function refresh() { try { renderBoard(await API.board()); } catch (e) {} }
  if (mine && mine.guess) API.board().then((b) => showDone(b, "Your guess is in")).catch(() => {});
  setInterval(() => { if (!$("#board").hidden && !document.hidden) refresh(); }, 15000);
})();
