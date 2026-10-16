/**
 * Sample builds for the pricing preview: the website's own configurator presets
 * (`presets` in src/data/build.ts), laid out by its own code (foundationLayout,
 * layoutAddOns in src/build/model.ts) on 2026-10-15, with the default foundation
 * (600 mm, footings + L plinth) and with footings only at 300 mm. `siteTotal` is
 * what the site's estimate() gave with the rates of src/data/pricing.ts at that
 * time; pricing.test.ts checks that priceBuild gives the same.
 *
 * Generated from the site. Regenerate rather than edit when the site's presets
 * or layout rules change (docs/WEBSITE-CONTRACT.md).
 */
import type { SampleBuild } from './pricing-calc';

export const SAMPLE_BUILDS: SampleBuild[] = [
  {
    "id": "the-pod",
    "name": "The Pod",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 1,
        "B": 0
      },
      "foundation": {
        "h": 1,
        "type": "plinth"
      },
      "footings": 4,
      "sharedFootings": 0,
      "plinthMetres": 18,
      "deckM2": 10.8,
      "posts": 5,
      "spandrelMetres": 9.6,
      "handrailMetres": 8.3,
      "steps": 1,
      "shades": 1,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 0,
      "stairFloors": 0
    },
    "sqft": 200,
    "siteTotal": 660000
  },
  {
    "id": "the-pod-footings",
    "name": "The Pod (footings only, 300 mm)",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 1,
        "B": 0
      },
      "foundation": {
        "h": 0,
        "type": "footings"
      },
      "footings": 4,
      "sharedFootings": 0,
      "plinthMetres": 0,
      "deckM2": 10.8,
      "posts": 5,
      "spandrelMetres": 9.6,
      "handrailMetres": 8.3,
      "steps": 1,
      "shades": 1,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 0,
      "stairFloors": 0
    },
    "sqft": 200,
    "siteTotal": 615000
  },
  {
    "id": "studio-max",
    "name": "Studio Max",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 1,
        "B": 1
      },
      "foundation": {
        "h": 1,
        "type": "plinth"
      },
      "footings": 7,
      "sharedFootings": 1,
      "plinthMetres": 27,
      "deckM2": 10.8,
      "posts": 6,
      "spandrelMetres": 13.2,
      "handrailMetres": 10.47,
      "steps": 2,
      "shades": 2,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 0,
      "stairFloors": 0
    },
    "sqft": 300,
    "siteTotal": 1039000
  },
  {
    "id": "studio-max-footings",
    "name": "Studio Max (footings only, 300 mm)",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 1,
        "B": 1
      },
      "foundation": {
        "h": 0,
        "type": "footings"
      },
      "footings": 7,
      "sharedFootings": 1,
      "plinthMetres": 0,
      "deckM2": 10.8,
      "posts": 6,
      "spandrelMetres": 13.2,
      "handrailMetres": 10.47,
      "steps": 2,
      "shades": 2,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 0,
      "stairFloors": 0
    },
    "sqft": 300,
    "siteTotal": 967000
  },
  {
    "id": "urban-suite",
    "name": "Urban Suite",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 2,
        "B": 0
      },
      "foundation": {
        "h": 1,
        "type": "plinth"
      },
      "footings": 6,
      "sharedFootings": 2,
      "plinthMetres": 30,
      "deckM2": 10.8,
      "posts": 5,
      "spandrelMetres": 9.6,
      "handrailMetres": 8.3,
      "steps": 1,
      "shades": 1,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 0,
      "stairFloors": 0
    },
    "sqft": 400,
    "siteTotal": 1174000
  },
  {
    "id": "urban-suite-footings",
    "name": "Urban Suite (footings only, 300 mm)",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 2,
        "B": 0
      },
      "foundation": {
        "h": 0,
        "type": "footings"
      },
      "footings": 6,
      "sharedFootings": 2,
      "plinthMetres": 0,
      "deckM2": 10.8,
      "posts": 5,
      "spandrelMetres": 9.6,
      "handrailMetres": 8.3,
      "steps": 1,
      "shades": 1,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 0,
      "stairFloors": 0
    },
    "sqft": 400,
    "siteTotal": 1097000
  },
  {
    "id": "the-homestead",
    "name": "The Homestead",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 2,
        "B": 1
      },
      "foundation": {
        "h": 1,
        "type": "plinth"
      },
      "footings": 8,
      "sharedFootings": 3,
      "plinthMetres": 39,
      "deckM2": 27,
      "posts": 12,
      "spandrelMetres": 22.2,
      "handrailMetres": 19.6,
      "steps": 2,
      "shades": 3,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 0,
      "stairFloors": 0
    },
    "sqft": 500,
    "siteTotal": 1682000
  },
  {
    "id": "the-homestead-footings",
    "name": "The Homestead (footings only, 300 mm)",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 2,
        "B": 1
      },
      "foundation": {
        "h": 0,
        "type": "footings"
      },
      "footings": 8,
      "sharedFootings": 3,
      "plinthMetres": 0,
      "deckM2": 27,
      "posts": 12,
      "spandrelMetres": 22.2,
      "handrailMetres": 19.6,
      "steps": 2,
      "shades": 3,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 0,
      "stairFloors": 0
    },
    "sqft": 500,
    "siteTotal": 1580000
  },
  {
    "id": "duplex-prime",
    "name": "Duplex Prime",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades",
      "solar"
    ],
    "quantities": {
      "shells": {
        "A": 3,
        "B": 0
      },
      "foundation": {
        "h": 1,
        "type": "plinth"
      },
      "footings": 6,
      "sharedFootings": 2,
      "plinthMetres": 30,
      "deckM2": 21.6,
      "posts": 10,
      "spandrelMetres": 19.2,
      "handrailMetres": 26.38,
      "steps": 2,
      "shades": 3,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 1,
        "B": 0
      },
      "galleryM2": 0,
      "stairFloors": 1
    },
    "sqft": 600,
    "siteTotal": 2087000
  },
  {
    "id": "duplex-prime-footings",
    "name": "Duplex Prime (footings only, 300 mm)",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades",
      "solar"
    ],
    "quantities": {
      "shells": {
        "A": 3,
        "B": 0
      },
      "foundation": {
        "h": 0,
        "type": "footings"
      },
      "footings": 6,
      "sharedFootings": 2,
      "plinthMetres": 0,
      "deckM2": 21.6,
      "posts": 10,
      "spandrelMetres": 19.2,
      "handrailMetres": 26.38,
      "steps": 2,
      "shades": 3,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 1,
        "B": 0
      },
      "galleryM2": 0,
      "stairFloors": 1
    },
    "sqft": 600,
    "siteTotal": 2010000
  },
  {
    "id": "villa",
    "name": "The Villa",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 6,
        "B": 0
      },
      "foundation": {
        "h": 1,
        "type": "plinth"
      },
      "footings": 10,
      "sharedFootings": 6,
      "plinthMetres": 54,
      "deckM2": 21.6,
      "posts": 9,
      "spandrelMetres": 15.6,
      "handrailMetres": 31.58,
      "steps": 1,
      "shades": 2,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 9,
      "stairFloors": 1
    },
    "sqft": 1200,
    "siteTotal": 3443000
  },
  {
    "id": "villa-footings",
    "name": "The Villa (footings only, 300 mm)",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 6,
        "B": 0
      },
      "foundation": {
        "h": 0,
        "type": "footings"
      },
      "footings": 10,
      "sharedFootings": 6,
      "plinthMetres": 0,
      "deckM2": 21.6,
      "posts": 9,
      "spandrelMetres": 15.6,
      "handrailMetres": 31.58,
      "steps": 1,
      "shades": 2,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 9,
      "stairFloors": 1
    },
    "sqft": 1200,
    "siteTotal": 3302000
  },
  {
    "id": "apartment",
    "name": "The Apartment",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 8,
        "B": 3
      },
      "foundation": {
        "h": 1,
        "type": "plinth"
      },
      "footings": 13,
      "sharedFootings": 7,
      "plinthMetres": 63,
      "deckM2": 27,
      "posts": 12,
      "spandrelMetres": 22.2,
      "handrailMetres": 51.51,
      "steps": 2,
      "shades": 5,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 18,
      "stairFloors": 1
    },
    "sqft": 1900,
    "siteTotal": 5471000
  },
  {
    "id": "apartment-footings",
    "name": "The Apartment (footings only, 300 mm)",
    "addOns": [
      "deck",
      "posts",
      "spandrel",
      "handrail",
      "steps",
      "shades"
    ],
    "quantities": {
      "shells": {
        "A": 8,
        "B": 3
      },
      "foundation": {
        "h": 0,
        "type": "footings"
      },
      "footings": 13,
      "sharedFootings": 7,
      "plinthMetres": 0,
      "deckM2": 27,
      "posts": 12,
      "spandrelMetres": 22.2,
      "handrailMetres": 51.51,
      "steps": 2,
      "shades": 5,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 0,
        "B": 0
      },
      "galleryM2": 18,
      "stairFloors": 1
    },
    "sqft": 1900,
    "siteTotal": 5305000
  },
  {
    "id": "midrise",
    "name": "Mid-Rise Apartment",
    "addOns": [
      "handrail",
      "shades",
      "solar"
    ],
    "quantities": {
      "shells": {
        "A": 18,
        "B": 5
      },
      "foundation": {
        "h": 1,
        "type": "plinth"
      },
      "footings": 13,
      "sharedFootings": 7,
      "plinthMetres": 63,
      "deckM2": 0,
      "posts": 0,
      "spandrelMetres": 0,
      "handrailMetres": 14.28,
      "steps": 0,
      "shades": 10,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 2,
        "B": 1
      },
      "galleryM2": 63,
      "stairFloors": 4
    },
    "sqft": 4100,
    "siteTotal": 11403000
  },
  {
    "id": "midrise-footings",
    "name": "Mid-Rise Apartment (footings only, 300 mm)",
    "addOns": [
      "handrail",
      "shades",
      "solar"
    ],
    "quantities": {
      "shells": {
        "A": 18,
        "B": 5
      },
      "foundation": {
        "h": 0,
        "type": "footings"
      },
      "footings": 13,
      "sharedFootings": 7,
      "plinthMetres": 0,
      "deckM2": 0,
      "posts": 0,
      "spandrelMetres": 0,
      "handrailMetres": 14.28,
      "steps": 0,
      "shades": 10,
      "roof": {
        "A": 0,
        "B": 0
      },
      "solar": {
        "A": 2,
        "B": 1
      },
      "galleryM2": 63,
      "stairFloors": 4
    },
    "sqft": 4100,
    "siteTotal": 11237000
  }
];

export const SITE_RATES_2026_10_15 = {
  "currency": "INR",
  "locale": "en-IN",
  "shell": {
    "A": 420000,
    "B": 245000
  },
  "footing": [
    7500,
    9500,
    12000
  ],
  "combined": 0.6,
  "plinth": [
    1600,
    2100,
    2700
  ],
  "deck": 4500,
  "post": 1900,
  "spandrel": 1400,
  "handrail": 3200,
  "steps": 16000,
  "shade": 12500,
  "roof": {
    "A": 48000,
    "B": 27000
  },
  "solar": {
    "A": 165000,
    "B": 90000
  },
  "gallery": 6000,
  "stair": 120000,
  "delivery": 38000
} as const;
