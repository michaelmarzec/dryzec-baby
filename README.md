# Dryzec Baby Pool

Guests guess Baby Dryzec's name, girl or boy, length, weight, birthday and birth time. Guests only ever see their own guess. Everyone's guesses, averages and top names are on the admin page only.

- `index.html`: the guessing page
- `admin.html`: everyone's guesses and stats, remove guesses, copy everything into a spreadsheet (uses the Chili Market admin password)
- `supabase/baby.sql`: run once in the Chili Market Supabase project's SQL Editor
- Hosting: GitHub Pages at `dryzec.baby`

Plain HTML, CSS and JavaScript. No build step.

## Don't push until after the reveal
GitHub Pages repos are public. Keep this folder on your computer until the news is out.

## Go live
1. Supabase → SQL Editor → paste `supabase/baby.sql` → Run.
2. Buy `dryzec.baby` on Cloudflare.
3. From this folder:
   ```bash
   git init && git add . && git commit -m "Dryzec Baby Pool" && git branch -M main
   gh repo create dryzec-baby --public --source=. --push
   gh api repos/michaelmarzec/dryzec-baby/pages -X POST -f "source[branch]=main" -f "source[path]=/"
   ```
4. Cloudflare DNS for dryzec.baby, all **DNS only** (grey cloud): four A records for `@` to 185.199.108.153, .109.153, .110.153, .111.153 and a CNAME `www` to `michaelmarzec.github.io`.
5. Once the certificate is issued: `gh api repos/michaelmarzec/dryzec-baby/pages -X PUT -F https_enforced=true`

## Try it locally
Set both values in `js/config.js` to `""` for demo mode, then `python3 -m http.server` and open http://localhost:8000. Demo admin password: `changeme`.

## Notes
- One guess per name. A guess can only be changed from the phone it was made on, so nobody can overwrite someone else's.
- Optional: set `dueLabel` in `js/config.js` (e.g. "Due spring 2027") to show it under the headline.
