# Credits and asset provenance

Provenance checked on 2026-10-18. This records evidence and source credits;
it does not assign a new license to recovered third-party assets.

## Original resource artwork: media/resources.png

The 990 x 990 PNG contains a 6 x 6 sheet of comic-style space resources and
machines. It first appears in commit `dd8cdac` (2023-12-21), "Added some icons,"
committed by the project author, Miroslav Uller. The file has only resolution
metadata; no creator, source URL, generator identifier or license is embedded.

The repository includes two prompts added later that day in commit `d70ec30`:

- [prompts/dalle-sheet1.txt](prompts/dalle-sheet1.txt) asks for a 6 x 6 comic
  game-asset sheet. Its layout and requested subject matter match the artwork.
- [prompts/dalle-sheet2.txt](prompts/dalle-sheet2.txt) asks for an 8 x 8 sheet
  with space, robots and aliens, and requests generation IDs.

These are evidence consistent with AI generation, likely using DALL-E, but
are not a generation receipt or a confirmed source for this exact PNG. The
sheet's origin remains **unconfirmed, probably AI-generated**. No external
artist attribution or asset-pack license has been identified. No CC0, MIT or
other blanket license is inferred for this sheet from its presence in Git.

The historical `diffusers-gen.py` was a separate raccoon text-to-image
experiment, not evidence for this sheet. It was removed during cleanup;
the tracked original can still be inspected in Git history.

## New SVG illustrations: media/art/

`ship.svg`, `toaster.svg`, `beacon.svg`, `warp.svg`, `wire.svg`, `circuit.svg`
and `plate.svg` were created directly as SVG code during the 2026 campaign
revival, with AI coding assistance. They do not incorporate downloaded stock
images. The original resource sheet remains separate and unchanged.

## Sound effects

The retained filenames and IDs match these Pixabay source pages:

| Local file | Source | Credited creator on source page |
| --- | --- | --- |
| `media/blip-131856.mp3` | [blip](https://pixabay.com/sound-effects/film-special-effects-blip-131856/) | `u_f1ee7vf7na` |
| `media/one_beep-99630.mp3` | [one_beep](https://pixabay.com/sound-effects/film-special-effects-one-beep-99630/) | gamer127 (Freesound), distributed through `freesound_community` |

Both source pages list the [Pixabay Content License](https://pixabay.com/service/license-summary/).
These credits identify the matching catalog entries; the repository does not
contain original download receipts. The sounds are used as in-game effects,
not presented as independently licensed original Zentar artwork.

## Original starfield code

The starfield preserved in [space.js](space.js) credits
[ditman's original JSFiddle](https://jsfiddle.net/ditman/8Ffrw/).
The original source URL remains in its header. Git commit `57a35cb` describes
adding the starfield from JSFiddle. A public derivative also preserves this
credit: [Starfield etc. on CodePen](https://codepen.io/djanlog/pen/xxRRNe).
The original fiddle could not be fetched during this audit, so its license
has not been verified; attribution alone is not a license determination.

## Fonts and libraries

The current campaign uses system fonts and native browser APIs. The earlier
Google Fonts import and jQuery CDN dependency are no longer loaded.
