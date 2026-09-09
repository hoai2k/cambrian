# Intake

**A handoff inbox, not an archive.** Delivered art is dropped here as it arrives, converted into
the assets the game actually loads, and then *deleted from this directory in the same commit*.
This folder should normally be empty apart from this file.

Anything still sitting here is unfinished work: it means art has been handed over and not yet
integrated. That is the whole reason the directory is worth having — it makes the queue visible.

## Procedure

1. **Drop** the delivered files here, as they came, with no renaming or pre-processing.
2. **Convert** them with the tool for their kind. Brand art is `npm run brand`
   (`tools/brand-intake.mjs`), which reads this directory and writes WebP into `public/assets/`.
   The conversion is deterministic: running it twice produces identical bytes.
3. **Check** the result in the place it is actually used — a cutout that looks fine on a white
   page can carry a pale fringe that only shows over dark water — and run `npm run check`.
4. **Remove** the source files from this directory and commit the deletion together with the
   converted assets, so one commit contains the whole handoff.

## Losing nothing by deleting

The originals stay in git history, so removing them here costs no fidelity. To get one back:

```
git log --diff-filter=A -- intake/<file>        # the commit that added that file
git show <commit>:intake/<file> > intake/<file>
```

Name the file, not the directory: several commits have added things here, so filtering on
`intake/` alone finds the wrong one.

Re-running the conversion on a recovered original reproduces the shipped asset exactly, which is
what makes the delete safe rather than merely tidy.
