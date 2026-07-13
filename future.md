# beta

# v1

create the website for this

add note that all skills are facotred at 10/10/10

let users toggle boss element
let users input boss def

let users toggle doll 15 on/off
let users toggle OL0 or OL5

let users toggle core/no core and input a % of time core is visible with clickable options like
No Core | 25% | 50 % | 75% | 100% | Custom (this would be a txt field)

add cube support

let users toggle cube per character
Resilience | Bastion | Other
then a level input
7 | 10 | 15 | custom (txt field)
cube images are ./img/bastion.webp ./img/resilience.webp

get images per character

show a % of total damage next to each character's damage

add hover tooltip for the cube (so it shows resilience/bastion)
set default cube to resilience
set default to doll15 enabled
set default to ol0
remove default team
don't show whether skills were auto parsed or hand verified on the frontend
add another show/hide toggle like the modeling notes that displays a list of buffs from the team
instead of selecting "boss element" invert it so the user selects "boss weakness" - currently, the user has to pick water and know it's elec weak, I want them to be able to just click elec instead

if the leftmost b2 is a 20s cd b2, then it will always use that b2

hardcode caveat for Red Hood specifically - append a line for users to select which b she is operating as to simplify her - for others, use the override model still

# v2

add a share button

liberalio: DONE (2026-07-12) — 202.5% (5 hits) in the override, 20.83% rider core-gated via requiresCore; validated vs scope-lock run (0.70 → ~1.0)

see if we can get character images for the bakery-bot sync as high res from blabla, include in the onetime sync
add support for diff skill levels (4,7,10), can fetch the values from blabla, include in onetime sync
will need a front end implementation per character for s1,s2,s3 + a "all skills 4,7,10" option at the top

- this will require us to change getting the skills from blabla instead of from nikke-synergy

add OL line support

- show ELE (textbox) ATK (textbox)
- show a + button that appends a newline for OL lines, has a dropdown to select the line and a textbox to input the stat

add best OL calculator

- 12 total possible lines, assume 8/12 are 4 atk 4 ele
- remaining 4 calculate between charge speed, charge damage, crit chance, crit damage, and max ammo, ignore hit and def, ignore charge speed and charge damage for units that arent RL/SR
- utilize the chart in ol-lines.csv
- assume tier 11 values for default calculation
- allow user to input tier values to re-calc at those values
- for RL/SR specifically, check at the following charge speed breakpoints: 5/8/11/15/18/21%
- report max ammo breakpoints - it is common for example to want exactly one max ammo roll on a character at a minimum amount, like ~67% on a 6 ammo character to get 10 ammo

# v3

add part support for v3

add best team

add best 5 teams

add new character support + best team calc + best OL calc

# share

add a share image? test embed sharing in disc, consider how we can factor this in to maiden bot
