# App Icons

To generate the required PNG icons from icon.svg:

Option 1 (Online): Upload icon.svg to https://realfavicongenerator.net
Option 2 (CLI): Use ImageMagick:
  convert -background none icon.svg -resize 192x192 icon-192.png
  convert -background none icon.svg -resize 512x512 icon-512.png

Required files:
- icon-192.png (192x192) — standard PWA icon
- icon-512.png (512x512) — splash screen + maskable icon
