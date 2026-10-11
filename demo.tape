# Render with: vhs demo.tape   (requires vhs + ttyd + ffmpeg)
# Produces assets/demo.gif used at the top of the README.

Output assets/demo.gif

Set FontSize 15
Set Width 900
Set Height 700
Set Padding 24
Set Theme "Catppuccin Mocha"
Set Shell bash

Type "strata src/model.mjs"
Sleep 400ms
Enter
Sleep 2s

Type "strata --ascii --max-rows 12 src/gitlog.mjs"
Sleep 400ms
Enter
Sleep 2s
