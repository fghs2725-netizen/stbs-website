/**
 * Pages for the towns the business serves (/areas/<slug>).
 *
 * Only facts the owner has confirmed appear here: the base in Bahalgarh, Sonipat, and the services and
 * their ranges already on the site. Each town's client list comes from the owner's invoice export
 * (2026-10-20), placed by the invoice address: businesses and institutions only, never people,
 * amounts or invoice numbers. Each page has its own wording so the
 * set is useful on its own rather than one template with the town swapped.
 */
export type AreaClient = [name: string, work: string, locality: string, years: string];

export interface Area {
  slug: string;
  name: string;
  /** "Sonipat, Haryana" etc. for the page eyebrow. */
  place: string;
  title: string;
  description: string;
  /** The H1; `*word*` renders as the serif accent. */
  heading: string;
  intro: string;
  /** Two paragraphs written for this town. */
  local: [string, string];
  /** Neighbourhoods, estates and nearby towns covered from here. */
  places: string[];
  /** Invoiced clients here: [name, work, locality, years]. */
  clients: AreaClient[];
  image: { src: string; alt: string };
  faqs: Array<[string, string]>;
}

const PERMISSION: [string, string] = [
  "Do I need permission to drill a borewell?",
  "In some areas, drawing groundwater for industrial or commercial use needs a permission from the groundwater authority, and rules differ by location. We tell you what usually applies to your site when we plan the job; the application itself stays with the site owner.",
];
const START: [string, string] = [
  "How do I get started?",
  "Send the site location and what you need through the proposal form or by phone. We review it, usually start with a ground survey, and send a written proposal.",
];

export const AREAS: ReadonlyArray<Area> = [
  {
    slug: "sonipat",
    name: "Sonipat",
    place: "Sonipat, Haryana",
    title: "Borewell & Tubewell Contractor in Sonipat | Saini Tubewell",
    description: "Borewell drilling, tubewell construction, water testing and rainwater harvesting in Sonipat from our base in Bahalgarh. Own rigs and crews, since 1992.",
    heading: "Borewell & tubewell contractor in *Sonipat*",
    intro: "Saini Tubewell Boring Service is based in Bahalgarh, Sonipat, and has drilled borewells and built tubewells across the district since 1992. Our own rigs and crews work from here, so a Sonipat site is a short drive, not a long mobilisation.",
    local: [
      "Sonipat district mixes industrial estates such as Barhi, Kundli and Rai, education and township projects such as Rajiv Gandhi Education City, and farmland. Ground conditions and water levels differ between them, which is why a borewell here starts with a ground survey of up to 800 m, not a guess.",
      "Our documented recent work in the district is rainwater harvesting and recharge for institutional and industrial sites, alongside borewells and tubewells for factories, campuses and farms.",
    ],
    places: ["Bahalgarh", "Sonipat city", "Kundli", "Rai", "Barhi", "Rajiv Gandhi Education City", "Ganaur", "Murthal", "Kharkhoda"],
    clients: [
      ["Jain Electroplast Pvt. Ltd.", "Borewell and rainwater harvesting", "Nathupur", "2024–2026"],
      ["Indogulf Cropsciences Ltd.", "Borewell and rainwater harvesting", "Barwasni", "2023–2026"],
      ["DS Cold Storage Chain", "Borewell and rainwater harvesting", "Murthal Road", "2026"],
      ["Sanjeevani Dairy Farms Pvt. Ltd.", "Borewell", "Khewra", "2026"],
      ["EOC Polymers India Pvt. Ltd.", "Borewell and rainwater harvesting", "HSIIDC Barhi", "2021–2025"],
      ["LT Foods Ltd.", "Borewell and pump installation", "Bahalgarh", "2022–2025"],
      ["ECE Industries Ltd.", "Borewell and pump installation", "Delhi Road, Sonipat", "2022–2025"],
      ["SS Maintenance and Management Services", "Borewell and rainwater harvesting", "Sonipat", "2023–2025"],
      ["Shri Shyam Metals", "Borewell and rainwater harvesting", "Jhundpur Industrial Area, Bahalgarh", "2024"],
      ["Alliance-Sonipat", "Borewell", "Khewra", "2024"],
      ["Nextra City", "Borewell and pump installation", "Kharkhoda", "2024"],
      ["Toyo Springs Ltd.", "Borewell and rainwater harvesting", "Bahalgarh Road", "2021–2024"],
      ["B.K. Anand Foods Pvt. Ltd.", "Pump installation and material supply", "Murthal Industrial Area", "2021–2023"],
      ["Svera Agro Ltd.", "Borewell and rainwater harvesting", "Dhaturi", "2022–2023"],
      ["The Sonipat Co-operative Sugar Mills Ltd.", "Pump installation and repair", "Sonipat", "2022–2023"],
      ["S.S.T", "Borewell and rainwater harvesting", "Sonipat", "2022–2023"],
      ["Jivo Wellness Pvt. Ltd.", "Borewell and rainwater harvesting", "Ganaur", "2022"],
      ["Gopiram Industries Pvt. Ltd.", "Borewell and pump installation", "Gangour", "2022"],
      ["Green India Rice Millers and Exporters Pvt. Ltd.", "Borewell", "Nahara", "2022"],
      ["Tulip City", "Material supply", "Sonipat", "2022"],
      ["Kirorimal Kashiram Marketing and Agencies Pvt. Ltd.", "Borewell and rainwater harvesting", "Bhurri", "2021–2022"],
      ["Shree Banke Bihari Healthcare LLP", "Borewell and pump installation", "Tulip City, Sector 17", "2021–2022"],
      ["Innovative Retail Concepts Pvt. Ltd.", "Rainwater harvesting", "Kumaspur", "2021–2022"],
      ["Enviro Infra Engineers Pvt. Ltd.", "Borewell and pump installation", "Sector 14, Sonipat", "2021"],
      ["NVS Industries", "Borewell and pump installation", "HSIIDC Barhi", "2021"],
      ["Rishihood University", "Pump installation and repair", "Bahalgarh", "2021"],
      ["Sapphire Extrupack Pvt. Ltd.", "Material supply", "Bahalgarh", "2021"],
      ["BGCC Developers Pvt. Ltd.", "Borewell and pump installation", "Tulip City, Sector 11", "2021"],
    ],
    image: { src: "/services/borewell-drilling-rods.webp", alt: "Crew members guiding a drill rod at a borewell rig" },
    faqs: [
      ["Where in Sonipat do you work?", "Across the district: Bahalgarh, Sonipat city, Kundli, Rai, Barhi, Rajiv Gandhi Education City, Ganaur, Murthal and Kharkhoda, from our base in Bahalgarh."],
      PERMISSION,
      START,
    ],
  },
  {
    slug: "kundli",
    name: "Kundli",
    place: "Kundli, Sonipat",
    title: "Borewell & Rainwater Harvesting in Kundli | Saini Tubewell",
    description: "Borewells, tubewells and rainwater harvesting for factories and warehouses in Kundli. We built the recharge system at a BigBasket distribution centre there.",
    heading: "Borewells and rainwater recharge in *Kundli*",
    intro: "Kundli, on the Delhi border, is full of factories, warehouses and distribution centres. We work on sites like these from our base in Sonipat, and have built a rainwater harvesting system for a BigBasket distribution centre in Kundli.",
    local: [
      "Big roofs and paved yards shed a lot of rain and return little of it to the ground. A recharge system with silt and filter chambers and a percolation bore sends that water back down instead of into the drain. Our Kundli job used a 250 mm bore, 220 ft deep, with 225 mm PVC pipe, a gravel pack and cleaning with a heavy-duty pump.",
      "For process and drinking water we drill and build borewells and tubewells for industrial and commercial units here, after a ground survey so the drilling point and depth are fixed before the rig arrives.",
    ],
    places: ["Kundli", "Rai", "Murthal", "Sonipat city"],
    clients: [
      ["More Retail Pvt. Ltd.", "Material supply", "Kundli", "2026"],
      ["Sanskriti Polymers", "Pump installation and repair", "Saboli, Rai", "2026"],
      ["ARI Polyrub Pvt. Ltd.", "Borewell and rainwater harvesting", "Wazidpur Saboli", "2025"],
      ["IRS Polymers Pvt. Ltd.", "Borewell and rainwater harvesting", "Bazidpur Saboli", "2024"],
      ["Drona Industries Pvt. Ltd.", "Borewell", "Wazidpur Saboli", "2024"],
      ["Capital Extrusion", "Borewell and rainwater harvesting", "HSIIDC Kundli", "2023"],
      ["S K Safety Consultancy Services", "Pump installation and repair", "HSIIDC Kundli", "2023"],
      ["Supermarket Grocery Supplies Pvt. Ltd. (BigBasket)", "Borewell and pump installation", "EPIP Kundli", "2022"],
      ["Swastik Polyvinyls Pvt. Ltd.", "Borewell and rainwater harvesting", "Kundli", "2022"],
      ["MNSS Rai", "Borewell and pump installation", "Rai", "2022"],
      ["SSIPL Retail Ltd.", "Borewell and rainwater harvesting", "Sersa Road, Kundli", "2021–2022"],
    ],
    image: { src: "/services/rainwater-harvesting-recharge.webp", alt: "Precast concrete rings beside an excavated recharge pit at a commercial site" },
    faqs: [
      ["Do you do rainwater harvesting for warehouses?", "Yes. We have built a recharge system for a distribution centre in Kundli. The design depends on the roof and yard area and the ground, which the site survey establishes."],
      PERMISSION,
      START,
    ],
  },
  {
    slug: "bahadurgarh",
    name: "Bahadurgarh",
    place: "Bahadurgarh, Jhajjar",
    title: "Borewell & Rainwater Harvesting in Bahadurgarh | Saini Tubewell",
    description: "Borewells, submersible pumps and rainwater harvesting for footwear, laminate and plastics units in Bahadurgarh's HSIIDC sectors and MIE.",
    heading: "Borewells and rainwater harvesting in *Bahadurgarh*",
    intro: "Bahadurgarh's footwear park and industrial estates are among our busiest areas. We have drilled borewells, installed and repaired submersible pumps and built rainwater harvesting systems for factories across HSIIDC Sectors 16 and 17, MIE Part-A and Kassar Road.",
    local: [
      "Footwear, rubber, laminate and plastics units here run on groundwater, and many sites must also return rainwater to the ground. We plan each borewell from a ground survey and build recharge bores with silt and filter chambers sized to the roof and yard.",
      "When a pump fails, a factory waits. We install and repair submersible pump sets and supply the cable, delivery pipe and panels they need, so one team handles the bore and everything on it.",
    ],
    places: ["HSIIDC Sector 16", "HSIIDC Sector 17 (Footwear Park)", "MIE Part-A", "Kassar Road", "Badli"],
    clients: [
      ["Singhla Laminates Pvt. Ltd.", "Borewell and rainwater harvesting", "MIE Part-A", "2026"],
      ["Green Line Laminates Pvt. Ltd.", "Borewell and rainwater harvesting", "MIE Part-A", "2026"],
      ["Kapur Rubber Industries", "Borewell and rainwater harvesting", "Sector 17", "2026"],
      ["Welcome Polymers (India) Pvt. Ltd.", "Borewell and rainwater harvesting", "Footwear Park, Sector 17", "2026"],
      ["Dayz Footwear India Pvt. Ltd.", "Borewell and rainwater harvesting", "Sector 17", "2026"],
      ["S.G. Footwears LLP", "Rainwater harvesting", "Footwear Park, Sector 17", "2026"],
      ["Star Kidz Ojas Footwear India Pvt. Ltd.", "Borewell and pump installation", "HSIIDC Sector 16", "2026"],
      ["A R V Footwear Pvt. Ltd.", "Borewell and pump installation", "MIE Part-A", "2026"],
      ["SFR Footwear Pvt. Ltd.", "Pump installation and repair", "MIE Part-A", "2026"],
      ["Bansal Enterprises", "Pump installation and repair", "MIE Part-A", "2026"],
      ["A B Footcare", "Pump installation and repair", "MIE Part-A", "2026"],
      ["A.P. Plastic Industries", "Pump installation and material supply", "HSIIDC Sector 17", "2026"],
      ["Saurav Footwear Pvt. Ltd.", "Borewell and rainwater harvesting", "Kassar Road, Sector 32", "2025"],
      ["Diamond Footcare Udyog Pvt. Ltd.", "Borewell and pump installation", "HSIIDC Sector 17", "2025"],
      ["Solemount Polytex Pvt. Ltd.", "Borewell and rainwater harvesting", "Footwear Park, Sector 17", "2025"],
      ["Aerokraft Overseas Business", "Borewell and rainwater harvesting", "Sector 17", "2025"],
      ["Gokul Footwear Pvt. Ltd.", "Pump installation and repair", "HSIIDC Sector 17", "2025"],
      ["Combit Footwear Pvt. Ltd.", "Material supply", "Footwear Park, Sector 17", "2025"],
      ["Aquapop Bottlers Pvt. Ltd.", "Rainwater harvesting", "Badli, Jhajjar", "2025"],
    ],
    image: { src: "/services/borewell-drilling-rods.webp", alt: "Crew members guiding a drill rod at a borewell rig" },
    faqs: [
      ["Do you repair pumps in existing borewells?", "Yes. Many of our Bahadurgarh jobs are submersible pump installations and repairs in bores that are already there."],
      PERMISSION,
      START,
    ],
  },
  {
    slug: "delhi",
    name: "Delhi",
    place: "Delhi",
    title: "Borewell & Rainwater Harvesting in Delhi | Saini Tubewell",
    description: "Borewells, rainwater harvesting and pump installation for builders, contractors and industrial units in Delhi, from Saini Tubewell since 1992.",
    heading: "Borewells and rainwater harvesting in *Delhi*",
    intro: "We take up borewell, rainwater harvesting and pump work in Delhi for builders, contractors and industrial units, from our base in Bahalgarh, Sonipat, just north of the city.",
    local: [
      "Groundwater in Delhi is closely regulated, and larger sites are often expected to recharge rainwater. We design recharge systems with silt and filter chambers and percolation bores, and plan any borewell only after a survey shows where the water is.",
      "Our Delhi work has included rainwater harvesting and borewells for builders and contractors, and pump installation for industrial units in areas such as Rithala and Peeragarhi.",
    ],
    places: ["Dwarka", "Rithala", "Peeragarhi", "Narela", "Bakhtawarpur", "North West Delhi"],
    clients: [
      ["Y.P. Infratech Pvt. Ltd.", "Borewell and rainwater harvesting", "Dwarka", "2026"],
      ["Capital Land Builders Pvt. Ltd.", "Borewell and pump installation", "New Delhi", "2024"],
      ["Ujjwal Contracts Pvt. Ltd.", "Borewell and rainwater harvesting", "Delhi", "2024"],
      ["Trela Footwear Exports Pvt. Ltd.", "Pump installation and material supply", "Udyog Nagar, Peeragarhi", "2021"],
      ["CFPL Pvt. Ltd.", "Borewell and pump installation", "Rithala", "2021"],
    ],
    image: { src: "/services/rainwater-harvesting-recharge.webp", alt: "Precast concrete rings beside an excavated recharge pit at a commercial site" },
    faqs: [
      ["Can you drill a borewell in Delhi?", "Rules for drawing groundwater in Delhi are strict and depend on the site and its use. We tell you what usually applies when we plan the job; recharge systems are often the first requirement."],
      PERMISSION,
      START,
    ],
  },
  {
    slug: "panipat",
    name: "Panipat",
    place: "Panipat, Haryana",
    title: "Borewell & Tubewell Contractor in Panipat | Saini Tubewell",
    description: "Borewell drilling, tubewell construction, water testing and material supply for industrial, commercial and farm sites in Panipat. Own rigs, since 1992.",
    heading: "Borewell drilling and tubewells in *Panipat*",
    intro: "Panipat is one of Haryana's main industrial cities. We serve Panipat sites from our base in Bahalgarh, Sonipat: borewell drilling, tubewell construction, water testing, rainwater recharge and material supply, with our own rigs and crews.",
    local: [
      "Industrial plants, warehouses and institutions use a lot of water, and the ground varies across the city and the villages around it. A ground survey of up to 800 m decides the drilling point and depth before any drilling; yield, water level and water quality are tested after the bore is built.",
      "We also supply casing, pump sets, cable, panels and fittings, for owners who want materials from us for work their own team will do.",
    ],
    places: ["Panipat city", "Samalkha", "Israna", "Madlauda", "Panipat industrial areas"],
    clients: [
      ["Shine India Sales and Service", "Borewell and pump installation", "Buana Lakhu", "2026"],
    ],
    image: { src: "/services/tubewell-rig-pipes.webp", alt: "A worker carrying white uPVC casing pipe past a drilling rig at an industrial site" },
    faqs: [
      ["Do you take work in Panipat?", "Yes. We serve Panipat and the villages around it from Sonipat. Send the location and what you need, and we will plan a site visit."],
      ["Can I buy only the materials?", "Yes. We supply uPVC casing in 100–500 mm, submersible pump sets of 1–50 HP, cable, delivery pipe and starter panels."],
      START,
    ],
  },
  {
    slug: "rohtak",
    name: "Rohtak",
    place: "Rohtak, Haryana",
    title: "Borewell & Tubewell Contractor in Rohtak | Saini Tubewell",
    description: "Borewell drilling, tubewell construction, groundwater survey and rainwater recharge for sites in Rohtak and nearby villages, from Saini Tubewell since 1992.",
    heading: "Borewell and tubewell work in *Rohtak*",
    intro: "We take up borewell and tubewell work in Rohtak and the surrounding villages from our base in Sonipat, for farms, institutions, industrial units and homes, with our own rigs and crews.",
    local: [
      "Water depth and quality change a great deal across Haryana, and a borewell that is right in one field can be wrong a few kilometres away. We survey the ground to up to 800 m first, fix the drilling point and depth, and test yield and quality once the bore is built.",
      "Borewells are drilled in 150–300 mm diameters, cased in ISI-marked uPVC, and developed until the water runs clear and sand-free before handover.",
    ],
    places: ["Rohtak city", "Industrial Model Township, Rohtak", "Kalanaur", "Meham", "Sampla"],
    clients: [
      ["SV International", "Borewell", "Sampla", "2022"],
    ],
    image: { src: "/services/water-testing-survey.webp", alt: "A surveyor with a resistivity meter and electrodes laid along a field" },
    faqs: [
      ["Do you work in villages near Rohtak?", "Yes. Send the location and we will plan a visit. Farm and village sites are common."],
      ["What does a ground survey tell me?", "Where the water-bearing zones are, and the drilling point and depth we recommend, written up in a survey report before drilling starts."],
      START,
    ],
  },
  {
    slug: "gurugram",
    name: "Gurugram",
    place: "Gurugram, Haryana",
    title: "Borewell & Rainwater Harvesting in Gurugram | Saini Tubewell",
    description: "Borewells, tubewells and rainwater harvesting for commercial and industrial sites in Gurugram and Manesar, planned after a ground survey. Since 1992.",
    heading: "Borewells and rainwater harvesting in *Gurugram*",
    intro: "We take up commercial and industrial borewell, tubewell and rainwater harvesting work in Gurugram and Manesar from our base in Sonipat. Larger jobs are planned with a site visit first.",
    local: [
      "In and around Gurugram, groundwater is under pressure and larger sites are often expected to return rainwater to the ground. We design recharge systems with silt and filter chambers and percolation bores, and plan borewells only after a survey shows where the water is.",
      "Ask us what your plot or building needs; rules differ by location and by the size of the site, and we tell you what usually applies.",
    ],
    places: ["Gurugram", "Manesar", "Udyog Vihar", "Sohna Road", "IMT Manesar"],
    clients: [
      ["Ludhiana Builders Pvt. Ltd.", "Borewell", "Gurugram", "2025"],
      ["Auspicious Construction Company Pvt. Ltd.", "Pump installation and material supply", "Pukharpur, Gurugram", "2021–2025"],
      ["Sobha Ltd.", "Borewell and rainwater harvesting", "Gurugram", "2022–2023"],
      ["Balaji Builders", "Borewell", "Gurugram", "2022–2023"],
    ],
    image: { src: "/services/borewell-material-supply-yard.webp", alt: "uPVC and steel casing pipes and submersible pumps in a supply yard" },
    faqs: [
      ["Do you work in Gurugram and Manesar?", "Yes, for commercial and industrial sites. These are planned with a site visit first, because access and permissions matter more on larger sites."],
      PERMISSION,
      START,
    ],
  },
];

export const areaBySlug = (slug: string) => AREAS.find((a) => a.slug === slug);
