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
      showDone(sameName ? "Guess updated" : "Guess saved");
    } catch (err) { $("#err").textContent = err.message; }
    btn.disabled = false; btn.textContent = mine ? "Update my guess" : "Submit my guess";
  });

  function showDone(title) {
    const g = mine.guess;
    $("#guessForm").hidden = true; $("#thanks").hidden = false;
    $("#thanks h2").textContent = title;
    $("#thanksText").textContent = `${g.baby_name}, a ${g.gender}, ${fmtWeight(g.weight_oz)}, ${g.length_in} in, born ${fmtDate(g.birth_date, true)} at ${fmtTime(g.birth_time)}.`;
  }
  $("#editBtn").addEventListener("click", () => {
    fill(mine.guess); $("#submit").textContent = "Update my guess";
    $("#fine").textContent = "Changing your name starts a new guess.";
    $("#thanks").hidden = true; $("#guessForm").hidden = false; $("#babyName").focus();
  });

  // returning guest: show their own guess (saved on this phone)
  if (mine && mine.guess) showDone("Your guess is in");
})();
