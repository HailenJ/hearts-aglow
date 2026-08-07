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
      { title: "Drift 36: Beau", duration: 894, trackId: '1055598064' },
      { title: "Drift 37: Patrick", duration: 576, trackId: '2044615139' },
      { title: "Drift 38: Ryder", duration: 777, trackId: '2607593878' },
      { title: "Drift 39: Rich", duration: 448, trackId: '80738616' },
      { title: "Drift 40: Taegan", duration: 790, trackId: '2611401977' },
      { title: "Drift 41: Lisa", duration: 666, trackId: '755167626' },
      { title: "Drift 42: Gavin", duration: 263, trackId: '3662359841' },
      { title: "Drift 43: Maycee", duration: 491, trackId: '2053666551' },
      { title: "Drift 44: Julie", duration: 434, trackId: '363886901' },
      { title: "Drift 45: Diane", duration: 224, trackId: '2919004547' },
      { title: "Drift 46: Mary", duration: 617, trackId: '2719346420' },
      { title: "Drift 47: River", duration: 905, trackId: '4208845829' }
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
      { title: "Drift 28", duration: 2141, trackId: '3175053927' },
      { title: "Drift 29", duration: 3044, trackId: '3916140793' },
      { title: "Drift 30", duration: 803, trackId: '292078516' },
      { title: "Drift 31", duration: 1276, trackId: '2498470903' },
      { title: "Drift 32", duration: 2036, trackId: '2229987844' },
      { title: "Drift 33", duration: 1394, trackId: '3057435298' },
      { title: "Drift 34", duration: 581, trackId: '58970792' },
      { title: "Drift 35", duration: 616, trackId: '764660909' }
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
      { title: "Process (feat Peachole, Maddi Baird)", duration: 265, trackId: '996980088' },
      { title: "Coda", duration: 325, trackId: '784125915' },
      { title: "Dusk", duration: 126, trackId: '2960797859' },
      { title: "Amor Fati (feat. Beardy, Jess Pluto, Sleepyhaze, Maddi Baird)", duration: 233, trackId: '3624881735' },
      { title: "From", duration: 164, trackId: '2407021906' },
      { title: "Shift", duration: 156, trackId: '295654514' },
      { title: "Twin", duration: 228, trackId: '138277736' },
      { title: "We Don't Talk Anymore (feat. Maddi Baird)", duration: 216, trackId: '2443035130' },
      { title: "Sunrise", duration: 260, trackId: '2757438284' }
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
      { title: "The Secrets We Keep I", duration: 358, trackId: '2811514010' },
      { title: "The Secrets We Keep II", duration: 124, trackId: '3780554337' },
      { title: "The Secrets We Keep III", duration: 118, trackId: '1565201702' },
      { title: "The Secrets We Keep IV", duration: 76, trackId: '4178581528' },
      { title: "The Secrets We Keep V", duration: 214, trackId: '1641327814' },
      { title: "The Secrets We Keep VI", duration: 142, trackId: '3858077270' },
      { title: "The Secrets We Keep VII", duration: 94, trackId: '17916491' },
      { title: "The Secrets We Keep VIII", duration: 100, trackId: '1884980610' },
      { title: "The Secrets We Keep IX", duration: 336, trackId: '3930904453' },
      { title: "The Secrets We Keep X", duration: 88, trackId: '3765792723' },
      { title: "The Secrets We Keep XI", duration: 88, trackId: '860971283' },
      { title: "The Secrets We Keep XII", duration: 62, trackId: '2925641602' }
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
      { title: "Drift 22: Philodendron Hederaceum", duration: 1856, trackId: '4147610997' },
      { title: "Drift 23: Pleurotus Djamor", duration: 2112, trackId: '2138044390' },
      { title: "Drift 24: Salix", duration: 1792, trackId: '3809115880' },
      { title: "Drift 25: Adenium Obesum", duration: 1815, trackId: '916954289' },
      { title: "Drift 26: Hyacinthus", duration: 1856, trackId: '1685502229' },
      { title: "Drift 27: Crassula", duration: 1792, trackId: '1142028672' }
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
      { title: "Drift Sixteen", duration: 1300, trackId: '3646832864' },
      { title: "Drift Seventeen", duration: 1590, trackId: '311217340' },
      { title: "Drift Eighteen", duration: 1285, trackId: '3843982374' },
      { title: "Drift Nineteen", duration: 1884, trackId: '196973088' },
      { title: "Drift Twenty", duration: 3140, trackId: '2094818873' },
      { title: "Drift Twenty-one", duration: 3300, trackId: '247006678' }
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
      { title: "julytwentyfirst", duration: 79, trackId: '4263645383' },
      { title: "decelerate", duration: 128, trackId: '3398907610' },
      { title: "en_passant", duration: 131, trackId: '3940644516' },
      { title: "five_am", duration: 136, trackId: '3678332518' },
      { title: "fare", duration: 103, trackId: '2624257103' },
      { title: "exalt", duration: 154, trackId: '196739735' },
      { title: "meander", duration: 144, trackId: '3029090315' },
      { title: "rmbr", duration: 107, trackId: '2946747004' }
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
      { title: "Drift Eight", duration: 660, trackId: '1909211336' },
      { title: "Drift Nine", duration: 849, trackId: '3127714205' },
      { title: "Drift Ten", duration: 1803, trackId: '619259421' },
      { title: "Drift Eleven", duration: 420, trackId: '2335022393' },
      { title: "Drift Twelve", duration: 698, trackId: '1867703228' },
      { title: "Drift Thirteen", duration: 438, trackId: '996015773' },
      { title: "Drift Fourteen", duration: 1056, trackId: '3617749101' },
      { title: "Drift Fifteen", duration: 3655, trackId: '345092604' }
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
      { title: "Drift One", duration: 570, trackId: '1492536496' },
      { title: "Drift Two", duration: 540, trackId: '2282455160' },
      { title: "Drift Three", duration: 418, trackId: '3234129228' },
      { title: "Drift Four", duration: 425, trackId: '1753821460' },
      { title: "Drift Five", duration: 370, trackId: '1761630646' },
      { title: "Drift Six", duration: 401, trackId: '1942613043' },
      { title: "Drift Seven", duration: 368, trackId: '1079470590' }
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
      { title: "Walk", duration: 272, trackId: '2502174550' },
      { title: "Campfire", duration: 248, trackId: '3312637092' },
      { title: "Ponder", duration: 376, trackId: '3707435302' },
      { title: "Steps", duration: 256, trackId: '3075705866' },
      { title: "You Were Here", duration: 240, trackId: '2192436110' },
      { title: "Build", duration: 180, trackId: '1295028654' },
      { title: "Home", duration: 272, trackId: '1336150008' },
      { title: "Waiting", duration: 256, trackId: '1760901617' },
      { title: "Limb", duration: 356, trackId: '1638441415' },
      { title: "Still", duration: 404, trackId: '1141133979' }
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
