---
name: build-module
description: Build one module of the Habit Tracker app, following CLAUDE.md and the module's spec in docs/modules/.
disable-model-invocation: true
argument-hint: [module number]
---

Build Module $0 of the Habit Tracker app.

1. Read `CLAUDE.md` fully. Then read `docs/modules/module-$0.md` fully.
   - If no module number was given, or that spec file does not exist, stop. Tell the owner the spec must be written first in the claude.ai planning chat. Do not invent one.
2. Check the Status section of `CLAUDE.md`:
   - If it says the previous module is not complete, stop and tell the owner.
   - If it says "Module $0 in progress: steps 1 to X done", continue from step X + 1 and tell the owner that is what you are doing.
3. Tell the owner in three or four plain sentences what this module will build and how it ends. Then start the spec's step 1.
4. Work through the spec's steps in order, one at a time. Before each step, say in one or two plain sentences what you will do and why, then wait for approval.
5. Rules for the whole session:
   - The owner is new to Git, terminals and web development. Use plain words, and explain any term the first time it appears.
   - Never break the rules in sections 6, 7 and 8 of `CLAUDE.md`. If a step would break one, stop and say so.
   - Pushing follows the **Pushing (Local sessions)** rule in `CLAUDE.md` section 14. Downloads: give the owner the exact command to type.
   - When the owner must test something (Live Server, Chrome DevTools, the phone), give a short numbered checklist of what to do and what they should see, then wait for their report.
   - If usage is running low, stop at the end of a step, commit locally without pushing, and record progress in Status.
   - Use British English.
6. When the spec's "Done when" list is complete, update Status, commit, ask the owner to push, and stop. Do not start the next module.
