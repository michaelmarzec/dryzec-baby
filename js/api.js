// Talks to Supabase when js/config.js has keys; otherwise a demo that lives in this browser.
(function () {
  const cfg = window.BABY_CONFIG || {};
  const LIVE = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const MESSAGES = {
    bad_guesser: "Add your name so we know who guessed.",
    bad_baby_name: "Give the baby a name (40 characters max).",
    bad_gender: "Pick girl or boy.",
    bad_length: "Length should be between 12 and 26 inches.",
    bad_weight: "Weight should be between 3 and 12 lb.",
    bad_date: "Pick a birthday within the next year.",
    bad_time: "Pick a birth time.",
    name_taken: "Someone already guessed under that name. Add a last initial, or use the phone you guessed on.",
    bad_admin: "Wrong admin password.",
  };
  const friendly = (m) => {
    for (const k in MESSAGES) if (String(m).includes(k)) return MESSAGES[k];
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Can't reach the pool right now. Check your signal and try again.";
    return m;
  };
  async function rpc(fn, args) {
    let res, data;
    try {
      res = await fetch(`${cfg.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
        method: "POST", headers: { apikey: cfg.supabaseAnonKey, "Content-Type": "application/json" }, body: JSON.stringify(args || {}),
      });
      data = await res.json().catch(() => null);
    } catch (e) { throw new Error(friendly(e.message)); }
    if (!res.ok) throw new Error(friendly((data && (data.message || data.hint)) || `Error ${res.status}`));
    return data;
  }
  const live = {
    submit: (g, token) => rpc("submit_guess", { p_guesser: g.guesser, p_baby_name: g.baby_name, p_gender: g.gender, p_length: g.length_in,
      p_weight_oz: g.weight_oz, p_date: g.birth_date, p_time: g.birth_time, p_token: token || null }),
    board: () => rpc("baby_board", {}),
    adminBoard: (pw) => rpc("admin_baby_check", { p_pw: pw }),
    adminDelete: (pw, id) => rpc("admin_delete_guess", { p_pw: pw, p_id: id }),
  };

  // ---------- demo ----------
  const KEY = "dryzec-demo-v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  let db = load() || { next: 4, guesses: [
    { id: 1, guesser: "Aunt Deb", key: "aunt deb", baby_name: "Rosie", gender: "girl", length_in: 19.5, weight_oz: 118, birth_date: day(150), birth_time: "03:14", token: "x1" },
    { id: 2, guesser: "Colorado Steve", key: "colorado steve", baby_name: "Steve Jr", gender: "boy", length_in: 21, weight_oz: 141, birth_date: day(140), birth_time: "14:30", token: "x2" },
    { id: 3, guesser: "Jackie", key: "jackie", baby_name: "Rosie", gender: "girl", length_in: 20, weight_oz: 124, birth_date: day(156), birth_time: "06:05", token: "x3" },
  ] };
  const fail = (c) => { throw new Error(friendly(c)); };
  const wait = (v) => new Promise((r) => setTimeout(() => r(v), 120));
  function board() {
    const g = db.guesses.slice().sort((a, b) => a.id - b.id), n = g.length;
    const avg = (f) => (n ? g.reduce((s, x) => s + f(x), 0) / n : null);
    const dates = g.map((x) => x.birth_date).sort();
    const mins = avg((x) => { const [h, m] = x.birth_time.split(":").map(Number); return h * 60 + m; });
    const counts = {};
    g.forEach((x) => { const k = x.baby_name.trim().toLowerCase(); counts[k] = (counts[k] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5)
      .map(([k, c]) => ({ name: k.replace(/\b\w/g, (m) => m.toUpperCase()), c }));
    return {
      guesses: g.map(({ key, token, ...x }) => x),
      stats: { count: n, girls: g.filter((x) => x.gender === "girl").length, boys: g.filter((x) => x.gender === "boy").length,
        avg_weight_oz: n ? Math.round(avg((x) => x.weight_oz)) : null, avg_length_in: n ? Math.round(avg((x) => x.length_in) * 10) / 10 : null,
        median_date: n ? dates[Math.ceil(n / 2) - 1] : null,
        avg_time: n ? `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(Math.round(mins % 60)).padStart(2, "0")}` : null, top_names: top },
    };
  }
  const demo = {
    async submit(g, token) {
      db = load() || db;
      const k = String(g.guesser || "").trim().replace(/\s+/g, " ").toLowerCase();
      if (!k) fail("bad_guesser");
      let row = db.guesses.find((x) => x.key === k);
      if (row && row.token !== token) fail("name_taken");
      if (!row) { row = { id: db.next++, key: k, token: "t" + Math.random().toString(36).slice(2) }; db.guesses.push(row); }
      Object.assign(row, { guesser: g.guesser.trim(), baby_name: g.baby_name.trim(), gender: g.gender, length_in: g.length_in,
        weight_oz: g.weight_oz, birth_date: g.birth_date, birth_time: g.birth_time });
      save(db); return wait({ token: row.token, id: row.id, board: board() });
    },
    async board() { db = load() || db; return wait(board()); },
    async adminBoard(pw) { if (pw !== "changeme") fail("bad_admin"); db = load() || db; return wait(board()); },
    async adminDelete(pw, id) { if (pw !== "changeme") fail("bad_admin"); db.guesses = db.guesses.filter((x) => x.id !== id); save(db); return wait(board()); },
  };

  window.BabyAPI = { LIVE, ...(LIVE ? live : demo) };
})();
