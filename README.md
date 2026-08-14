# java.quest

A typing arcade for practicing core Java concepts — pick a topic from the index page, fill in the missing code, and keep your streak alive across three difficulty levels.

## Structure

```
index.html          topic picker / landing page
assets/game.css      shared styling for every game page
assets/game.js        shared game engine, driven by window.TOPIC per page
topics/*.html         one page per concept, each defining its own question bank
```

15 topics, 141 challenges total, spanning fundamentals (variables, operators,
control flow, loops, arrays, strings, methods) through OOP (static, this,
constructors, inheritance, encapsulation, polymorphism, interfaces/abstract
classes) to exception handling.

## Play it locally

Open `index.html` in a browser — no build step, no dependencies. (The `build.py`
and `generate.py` scripts are only needed if you want to add or edit topics;
they're not required to run the site.)

## Publish on GitHub Pages

1. Create a new repo and push everything in this folder (`index.html`,
   `assets/`, `topics/`, this `README.md`) to it.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
4. Save. GitHub will give you a URL like
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.

## How it plays

- **Lives**: 3 coffee cups. A wrong or timed-out answer costs one.
- **Streak**: consecutive correct answers raise your score multiplier.
- **Levels**: level 1 has no timer, level 2 adds a 16s countdown, level 3
  drops to 11s and asks for fuller statements instead of single tokens.
- **Best score** per topic is saved in the browser via `localStorage` and
  shown on the index page once you've played it.

## Adding a topic

Easiest path: edit `build.py`, add a new `topic(slug, title, category,
file_base, bank)` call following the existing examples, then run:

```
python3 build.py
python3 generate.py
```

This regenerates `topics/<slug>.html` and refreshes `index.html` with the
new card. Each question in a bank needs `lvl` (1-3), `prompt`, `before`,
`blank` (the expected answer), `after`, and `hint`.
