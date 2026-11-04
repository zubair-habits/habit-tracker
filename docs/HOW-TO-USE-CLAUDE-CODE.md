# How to use Claude Code for this project

A short guide for the owner. Claude Code is Claude working inside your project folder: it reads and writes the files in `app_3` and runs commands there, asking you before each action.

## 1. Start a session

### In the Claude desktop app (the owner's choice)

1. Open the Claude desktop app → **Code** tab (the `</>` icon at the top left) → **New**.
2. In the row under the message box:
   - Click the **environment selector** (the first item; it may show a cloud icon and a name such as `P1`) and choose **Local**. Cloud environments run on Anthropic's computers, cannot see files that are not pushed yet, and cannot do your Live Server or phone tests.
   - Click the **folder** control next to it and choose `C:\Users\zzuba\mera wala\app_3`.
   - Click the **permission mode** (it may say `Auto`) and choose **Manual**, so Claude asks before every edit and command.
   - Click the **model picker** (it shows e.g. `Opus 5.5`). If the Fable row says **"Requires usage credits"**, keep Opus.
3. Paste the start message from step 5 below and press Enter.
4. Pushing: when Claude asks you to push, open the **Terminal** pane (the `>_` button at the top right, or Ctrl+`), type `git push` and press Enter.

### In the terminal (alternative)

1. Open **PowerShell** (Start menu → type "PowerShell" → Enter).
2. Go to the project folder. The quotes are needed because the path has a space:
   ```
   cd "C:\Users\zzuba\mera wala\app_3"
   ```
3. Start Claude Code:
   ```
   claude
   ```
4. Choose the model: type `/model` and press Enter.
   - If the **Fable** row says **"Requires usage credits"**, Fable would cost extra money. Choose **Opus** instead.
   - Otherwise choose Fable. Arrow keys move, Enter selects.
5. Start the module.
   - **Module 1 (first time only):** paste this and press Enter:
     ```
     Read CLAUDE.md fully, then docs/modules/module-1.md fully. Build Module 1 by following that file's steps in order, one step at a time, explaining each step in plain words and waiting for my approval before doing it.
     ```
     Step 1 of Module 1 installs a shortcut command, so after that:
   - **Module 2 onwards:** type `/build-module 2` (or 3, 4 …) and press Enter.

   That is the whole instruction. Claude reads `CLAUDE.md` and the module's spec, then walks you through every step.

## 2. Answering Claude

Claude explains each step, then waits. Reply in plain words, for example "yes, go ahead", "why?", or "wait, show me the file first".

When Claude wants to edit a file or run a command, a **permission box** appears with numbered options:

| Option | When to pick it |
|---|---|
| **Yes** | Normal choice. Approves this one action |
| **Yes, and don't ask again** for this kind of action | Only for harmless repeated actions such as `git status`. Never for `git push` or deleting files |
| **No, and tell Claude what to do differently** | Something looks wrong. Then type what you want instead |

Press the number, or use the arrow keys and Enter.

## 3. Keys and commands you need

| Type this | What it does |
|---|---|
| `Esc` | Stops Claude immediately, mid-action. Safe to press any time |
| `/model` | Change model |
| `/usage` | Shows how much of your plan's usage is left |
| `! some command` | Runs a command yourself. `!` switches to Git Bash, so use Bash syntax |
| `! git push` | Sends your commits to GitHub, which publishes the app. Claude asks you to run this; it cannot sign in to GitHub itself |
| `/remote-control Habit Tracker` | Lets you approve steps from the Claude app on your phone (Code tab). The laptop must stay on and awake |
| `/clear` | Starts a fresh conversation in the same folder |
| `/exit` | Quits Claude Code |
| `Shift+Tab` | Changes permission mode. **Leave it on the default** (Claude asks before every edit). If you press it by accident, press it again until no mode label is shown |

## 4. If you stop halfway

- **Closed the window or ran out of usage:** reopen PowerShell, `cd` to the folder, then run `claude --continue` to pick up the last conversation. If that fails, start `claude` and type `/build-module 1` again; Claude reads Status and continues from the right step.
- **Usage limit reached:** Claude stops at the end of a step and commits without pushing. Nothing goes to your phone until the module is finished.

## 5. When something goes wrong

1. Press `Esc`.
2. Tell Claude in plain words what you saw, for example "the test page shows 2 FAIL" or "the phone shows a white screen".
3. If Claude fails on the same problem two or three times, copy the error text and Claude's last message, and bring them to the claude.ai **PWAs** project chat.

## 6. Testing tools Claude will ask you to use

- **Live Server** (VS Code): right-click `index.html` or `tests/index.html` → **Open with Live Server**. A red CSP error about Live Server's own script is expected and harmless.
- **Chrome DevTools**: in that Chrome tab press `F12`. **Application** tab → IndexedDB shows the database. **Network** tab → change "No throttling" to **Offline** to test without internet. The phone icon at the top left shows a phone-sized view.
- **Phone**: open the installed app from the home-screen icon, not from a Chrome tab. For the debug console, open `https://zubair-habits.github.io/habit-tracker/?debug=1` in Chrome.

## 7. Rules worth remembering

- Never uninstall the app from your phone to fix anything.
- Never rename the GitHub organisation or repository.
- One module per session, finished before you stop. Pushing only happens at the steps that say so.
