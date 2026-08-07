import { slugify } from '../lib/route.js'

const rawMusicReleases = [
  {
    id: 1,
    title: 'Drift 6',
    type: 'drift',
    year: '2024',
    url: 'https://hailenjackson.bandcamp.com/album/drift-6',
    image: 'https://f4.bcbits.com/img/a3819146014_10.jpg',
    artist: 'Hailen Jackson',
    tracks: [
      { title: "Drift 36: Beau", duration: 894 },
      { title: "Drift 37: Patrick", duration: 576 },
      { title: "Drift 38: Ryder", duration: 777 },
      { title: "Drift 39: Rich", duration: 448 },
      { title: "Drift 40: Taegan", duration: 790 },
      { title: "Drift 41: Lisa", duration: 666 },
      { title: "Drift 42: Gavin", duration: 263 },
      { title: "Drift 43: Maycee", duration: 491 },
      { title: "Drift 44: Julie", duration: 434 },
      { title: "Drift 45: Diane", duration: 224 },
      { title: "Drift 46: Mary", duration: 617 },
      { title: "Drift 47: River", duration: 905 }
    ],
    description: `Drift 6 is the latest in the Drift album series, ambient albums created to help rest, relax, and inspire. Written completely with bio midi sonification from loved ones - friends and family had diodes strapped to their arms and that data was translated to midi notes. A love letter to important people in my life in a digital form that could last beyond their lifetimes.`,
    bandcampId: '329094219'
  },
  {
    id: 2,
    title: 'Drift 5',
    type: 'drift',
    year: '2022',
    url: 'https://hailenjackson.bandcamp.com/album/drift-5',
    image: 'https://f4.bcbits.com/img/a3423859940_10.jpg',
    artist: 'Hailen Jackson',
    tracks: [
      { title: "Drift 28", duration: 2141 },
      { title: "Drift 29", duration: 3044 },
      { title: "Drift 30", duration: 803 },
      { title: "Drift 31", duration: 1276 },
      { title: "Drift 32", duration: 2036 },
      { title: "Drift 33", duration: 1394 },
      { title: "Drift 34", duration: 581 },
      { title: "Drift 35", duration: 616 }
    ],
    description: `Fifth release in the Drift series, albums created for sleep/relaxation/studying. All sounds are guitar with help from Chase Bliss, Collision Devices, GFI System, Strymon Engineering and Empress Effects. Art by Justin LaGuff.`,
    bandcampId: '3943694481'
  },
  {
    id: 3,
    title: 'Coda',
    type: 'album',
    year: '2021',
    url: 'https://hailenjackson.bandcamp.com/album/coda',
    image: 'https://f4.bcbits.com/img/a3405404133_10.jpg',
    artist: 'Hailen Jackson',
    tracks: [
      { title: "Process (feat Peachole, Maddi Baird)", duration: 265 },
      { title: "Coda", duration: 325 },
      { title: "Dusk", duration: 126 },
      { title: "Amor Fati (feat. Beardy, Jess Pluto, Sleepyhaze, Maddi Baird)", duration: 233 },
      { title: "From", duration: 164 },
      { title: "Shift", duration: 156 },
      { title: "Twin", duration: 228 },
      { title: "We Don't Talk Anymore (feat. Maddi Baird)", duration: 216 },
      { title: "Sunrise", duration: 260 }
    ],
    description: `The follow-up to Rebuild, in the works since 2019. A mix of everything I've made so far with some new things thrown in. Features people that mean the world to me - from features, field recordings, to voicemails left for this album. Art by grayson_bear.`,
    bandcampId: '2367866191'
  },
  {
    id: 4,
    title: 'The Secrets We Keep',
    type: 'soundtrack',
    year: '2021',
    url: 'https://hailenjackson.bandcamp.com/album/the-secrets-we-keep',
    image: 'https://f4.bcbits.com/img/a4145378259_10.jpg',
    artist: 'Hailen Jackson',
    tracks: [
      { title: "The Secrets We Keep I", duration: 358 },
      { title: "The Secrets We Keep II", duration: 124 },
      { title: "The Secrets We Keep III", duration: 118 },
      { title: "The Secrets We Keep IV", duration: 76 },
      { title: "The Secrets We Keep V", duration: 214 },
      { title: "The Secrets We Keep VI", duration: 142 },
      { title: "The Secrets We Keep VII", duration: 94 },
      { title: "The Secrets We Keep VIII", duration: 100 },
      { title: "The Secrets We Keep IX", duration: 336 },
      { title: "The Secrets We Keep X", duration: 88 },
      { title: "The Secrets We Keep XI", duration: 88 },
      { title: "The Secrets We Keep XII", duration: 62 }
    ],
    description: 'Original Soundtrack',
    bandcampId: '2841498943'
  },
  {
    id: 5,
    title: 'Drift 4',
    type: 'drift',
    year: '2021',
    url: 'https://hailenjackson.bandcamp.com/album/drift-4',
    image: 'https://f4.bcbits.com/img/a0800919021_10.jpg',
    artist: 'Hailen Jackson',
    tracks: [
      { title: "Drift 22: Philodendron Hederaceum", duration: 1856 },
      { title: "Drift 23: Pleurotus Djamor", duration: 2112 },
      { title: "Drift 24: Salix", duration: 1792 },
      { title: "Drift 25: Adenium Obesum", duration: 1815 },
      { title: "Drift 26: Hyacinthus", duration: 1856 },
      { title: "Drift 27: Crassula", duration: 1792 }
    ],
    description: `Every song on this album was written by the plant in the title using a bio midi sonification device. Track 3 Salix was written by the dying willow tree that has been in my backyard my entire life. Art by Alexander Laird.`,
    bandcampId: '3050261402'
  },
  {
    id: 6,
    title: 'Drift 3',
    type: 'drift',
    year: '2020',
    url: 'https://hailenjackson.bandcamp.com/album/drift-3',
    image: 'https://f4.bcbits.com/img/a3086208354_10.jpg',
    artist: 'Hailen Jackson',
    tracks: [
      { title: "Drift Sixteen", duration: 1300 },
      { title: "Drift Seventeen", duration: 1590 },
      { title: "Drift Eighteen", duration: 1285 },
      { title: "Drift Nineteen", duration: 1884 },
      { title: "Drift Twenty", duration: 3140 },
      { title: "Drift Twenty-one", duration: 3300 }
    ],
    description: `Third release in the Drift series, created for sleep and relaxation. Made using an Octatrack sampler.`,
    bandcampId: '994216100'
  },
  {
    id: 7,
    title: 'Exalt',
    type: 'album',
    year: '2020',
    url: 'https://hailenjackson.bandcamp.com/album/exalt',
    image: 'https://f4.bcbits.com/img/a0774289478_10.jpg',
    artist: 'Hailen Jackson',
    tracks: [
      { title: "julytwentyfirst", duration: 79 },
      { title: "decelerate", duration: 128 },
      { title: "en_passant", duration: 131 },
      { title: "five_am", duration: 136 },
      { title: "fare", duration: 103 },
      { title: "exalt", duration: 154 },
      { title: "meander", duration: 144 },
      { title: "rmbr", duration: 107 }
    ],
    description: `Beat-driven electronic album exploring hip-hop and downtempo territories.`,
    bandcampId: '847710945'
  },
  {
    id: 8,
    title: 'Drift 2',
    type: 'drift',
    year: '2020',
    url: 'https://hailenjackson.bandcamp.com/album/drift-2',
    image: 'https://f4.bcbits.com/img/a1941621832_10.jpg',
    artist: 'Hailen Jackson',
    tracks: [
      { title: "Drift Eight", duration: 660 },
      { title: "Drift Nine", duration: 849 },
      { title: "Drift Ten", duration: 1803 },
      { title: "Drift Eleven", duration: 420 },
      { title: "Drift Twelve", duration: 698 },
      { title: "Drift Thirteen", duration: 438 },
      { title: "Drift Fourteen", duration: 1056 },
      { title: "Drift Fifteen", duration: 3655 }
    ],
    description: `Second release in the Drift series, created for sleep and relaxation. Made using an OP-1 synth.`,
    bandcampId: '1153137225'
  },
  {
    id: 9,
    title: 'Drift',
    type: 'drift',
    year: '2020',
    url: 'https://hailenjackson.bandcamp.com/album/drift',
    image: 'https://f4.bcbits.com/img/a3393213433_10.jpg',
    artist: 'Hailen Jackson',
    tracks: [
      { title: "Drift One", duration: 570 },
      { title: "Drift Two", duration: 540 },
      { title: "Drift Three", duration: 418 },
      { title: "Drift Four", duration: 425 },
      { title: "Drift Five", duration: 370 },
      { title: "Drift Six", duration: 401 },
      { title: "Drift Seven", duration: 368 }
    ],
    description: `The first Drift album, started during quarantine. Inspired by Brian Eno's Music For Airports. Created for sleep and relaxation using a Deluge sequencer.`,
    bandcampId: '1795009574'
  },
  {
    id: 10,
    title: 'Rebuild',
    type: 'album',
    year: '2019',
    url: 'https://hailenjackson.bandcamp.com/album/rebuild',
    image: 'https://f4.bcbits.com/img/a1518516741_10.jpg',
    artist: 'Hailen Jackson',
    tracks: [
      { title: "Walk", duration: 272 },
      { title: "Campfire", duration: 248 },
      { title: "Ponder", duration: 376 },
      { title: "Steps", duration: 256 },
      { title: "You Were Here", duration: 240 },
      { title: "Build", duration: 180 },
      { title: "Home", duration: 272 },
      { title: "Waiting", duration: 256 },
      { title: "Limb", duration: 356 },
      { title: "Still", duration: 404 }
    ],
    description: `Atmospheric electronic album blending ambient textures with introspective beats.`,
    bandcampId: '695879238'
  },
]

// `slugify` returns '' for a title made entirely of punctuation, and an empty
// slug silently degrades a deep link to the bare window route. `id` is always
// present and unique, so it is the fallback that keeps every release linkable.
export const musicReleases = rawMusicReleases.map(r => ({ ...r, slug: slugify(r.title) || String(r.id) }))

export const socialLinks = [
  { name: 'Email', url: 'mailto:hailen@heartsaglow.io', label: 'hailen@heartsaglow.io' },
  { name: 'Bandcamp', url: 'https://hailenjackson.bandcamp.com', label: 'hailenjackson.bandcamp.com' },
  { name: 'Bluesky', url: 'https://bsky.app/profile/heartsaglow.io', label: '@heartsaglow.io' },
  { name: 'Twitter', url: 'https://twitter.com/heartsaglow', label: '@heartsaglow' },
  { name: 'TikTok', url: 'https://tiktok.com/@hearts_aglow', label: '@hearts_aglow' },
]

const rawGames = []
export const games = rawGames.map(r => ({ ...r, slug: slugify(r.title) || String(r.id) }))

const rawSoftware = []
export const software = rawSoftware.map(r => ({ ...r, slug: slugify(r.title) || String(r.id) }))

// Real product truth: one title, in development, publicly teased, not yet
// named in site data. Every field stays empty until the real value arrives —
// a placeholder title here would ship as a claim.
export const game = {
  title: '',
  year: '',
  status: 'in development',
  logline: '',
  keyArt: '',
  storeUrl: '',
}

export const heroSubtitle = 'Light, sound, and what hums beneath.'

export const aboutParagraphs = [
  { text: 'Some things glow from within.' },
  { text: 'Hearts Aglow is a small studio for games, software, and music — all built on the belief that digital spaces can feel alive.' },
  { text: 'whose atmospheric electronic work has soundtracked games, films, and late-night radio across the world.', linkText: 'Hailen Jackson', linkUrl: 'https://hailenjackson.bandcamp.com' },
  { text: 'We make things that breathe. Come drift with us.' },
]
