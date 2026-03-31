# Dream Weaver — Developer Notes

---

## Git Cheat Sheet

### Save a permanent checkpoint (do this after finishing a session)
```
git add -A
git status
git commit -m "describe what is working"
git push
```
- `git add -A` stages every changed and new file
- `git status` shows you exactly what will be saved — review it before committing
- `git commit` saves the snapshot locally
- `git push` sends it to GitHub so it's backed up offsite

### Save a quick snapshot (before a big change)
```


```

### Back up to GitHub (do this after committing)
```
git push
```
That's it. One command sends everything to GitHub.

**A note on security:** GitHub private repositories are only visible to you (and anyone you explicitly invite). Your dream records and session notes in the code will not be visible to the public. That said, the repository contains code — not your actual dream data, which lives in Supabase. So even if someone somehow accessed the repo, they would see the app code, not your journal entries.

---

### See all your saved snapshots
```
git log --oneline
```

### Roll back to a previous snapshot if something breaks
```
git checkout abc1234
```
*(replace abc1234 with the code shown in your log)*

---

## How to Start the App
```
npm run dev
```
Then open: http://localhost:5173

---

## Useful Things to Remember
- Supabase dashboard: supabase.com
- Anthropic API keys: console.anthropic.com
- Vercel dashboard: vercel.com
- Always git commit BEFORE pasting a big new prompt into Claude Code

---

## Prompts I've Used
*(paste any Claude Code prompts here so you can find them later)*
Please update docs/DREAMWEAVER_CLAUDE_CONTEXT.md 
to reflect everything built in this session:
- Move completed features to the built list
- Add any new files to the file structure
- Add any new database columns
- Update known issues
- Update "What's Next" priority order

Show me the changes before saving.