/**
 * Service-page FAQs. Every answer restates something the site or the printed catalogue already
 * says; no turnaround, price or warranty figures appear until the owner signs them off. Each page also
 * answers one question in Hindi, because many searches are in Hindi (ट्यूबवेल, बोरिंग, बोरवेल).
 */
export type Faq = [question: string, answer: string];

const AREA: Faq = ["Which areas do you serve?", "Sonipat, Kundli, Bahadurgarh, Panipat, Rohtak, Gurugram, Delhi and the rest of Delhi NCR, from our base in Bahalgarh, Sonipat."];
const QUOTE: Faq = ["How do I get a quotation?", "Share the site location and what you need through the proposal form or by phone. We review it and send a written quotation; turnaround and warranty terms are set out in that quotation."];

export const SERVICE_FAQS: Record<string, Faq[]> = {
  "water-testing": [
    ["How deep can the ground survey reach?", "Our electrical ground survey reaches up to 800 m. It locates water-bearing zones so the drilling point and depth are fixed before any drilling starts."],
    ["What do I receive after the survey?", "A written survey report with the recommended drilling point and depth. After the bore is built we also test yield, water level and key water-quality parameters such as TDS and pH."],
    ["Do you test water after drilling too?", "Yes. A yield and water-level test follows drilling, along with a water-quality check."],
    ["क्या बोरिंग से पहले पानी की जाँच होती है?", "हाँ। हम 800 मीटर तक का ज़मीनी सर्वे करते हैं, जिससे पानी की सही जगह और गहराई बोरिंग से पहले तय हो जाती है। बोर बनने के बाद पानी की मात्रा, लेवल और TDS, pH जैसी गुणवत्ता भी जाँचते हैं।"],
    QUOTE,
    AREA,
  ],
  "borewell-drilling": [
    ["What bore diameters do you drill?", "150–300 mm (6\"–12\") with our own rotary rigs and crews."],
    ["What casing do you use?", "uPVC casing from 100 to 500 mm, rated 10 kg/cm² and ISI marked, planned to isolate the aquifer from the upper strata."],
    ["When is the borewell considered finished?", "We develop the bore until the water runs clear and sand-free, then coordinate installation and handover."],
    ["Do you survey before drilling?", "Yes. We offer a ground survey up to 800 m so the drilling point and depth are decided on evidence, not guesswork."],
    ["क्या आप बोरवेल और पानी की बोरिंग का काम करते हैं?", "हाँ। सोनीपत, कुंडली, बहादुरगढ़ और पूरे दिल्ली NCR में 150 से 300 mm (6 से 12 इंच) तक का बोरवेल अपनी रिग और टीम से करते हैं। रेट के लिए साइट की लोकेशन फ़ोन या कोटेशन फ़ॉर्म से भेजें, हम लिखित कोटेशन देते हैं।"],
    QUOTE,
    AREA,
  ],
  "tubewell-construction": [
    ["What does tubewell construction include?", "Site coordination, casing, slotted filter pipe and gravel pack, a stainless-steel submersible pump with HDPE rising main, cable and starter panel, then well-head assembly, testing, cleanup and handover."],
    ["Who is this for?", "Residential properties, agricultural sites, and commercial and industrial facilities."],
    ["ट्यूबवेल लगवाने में क्या-क्या आता है?", "केसिंग, फ़िल्टर पाइप और ग्रेवल पैक, सबमर्सिबल पंप, HDPE पाइप, केबल और स्टार्टर पैनल, फिर टेस्टिंग और हैंडओवर। सारा सामान भी हम अपने यार्ड से देते हैं, इसलिए पूरा काम एक ही टीम करती है।"],
    ["Can you supply the materials as well?", "Yes. We supply uPVC casing, submersible pumps, cable, delivery pipe and starter panels from our own yard, so one team handles the job end to end."],
    QUOTE,
    AREA,
  ],
  "borewell-material-supply": [
    ["What size casing do you stock?", "uPVC casing from 100 to 500 mm, from brands including Supreme, Kisan, Jindal and Reliance."],
    ["What pump ranges are available?", "Stainless-steel submersible pumps from 1 to 50 HP, from brands including CRI, Crompton and Field Marshal."],
    ["What else do you supply?", "Submersible cable 2.5–6 sq mm, HDPE delivery pipe 1\"–3\", automatic starter panels, well-head fittings and filter gravel."],
    ["क्या बोरवेल पंप और पाइप भी मिलते हैं?", "हाँ। 1 से 50 HP तक के सबमर्सिबल पंप, 100 से 500 mm तक के uPVC केसिंग पाइप, केबल, डिलीवरी पाइप और स्टार्टर पैनल।"],
    QUOTE,
    AREA,
  ],
  "rainwater-harvesting": [
    ["What does a recharge system include?", "Site assessment and runoff planning, recharge bores with slotted pipe and gravel pack, RCC recharge chambers with cover slab and overflow, and silt and filter chambers."],
    ["How deep are the recharge bores?", "On our documented projects, up to 40 m deep, with 300 mm percolation bores and slotted uPVC casing in pea gravel."],
    ["Have you built these for large sites?", "Yes: a distribution centre in Kundli, a university campus in Sonipat and an industrial estate in Barhi, all in Haryana."],
    ["रेनवाटर हार्वेस्टिंग या रिचार्ज पिट बनवाना है?", "हम फ़ैक्ट्री, गोदाम और संस्थानों के लिए रिचार्ज बोर, RCC रिचार्ज चैंबर और सिल्ट व फ़िल्टर चैंबर बनाते हैं, ताकि छत और यार्ड का बारिश का पानी ज़मीन में वापस जाए।"],
    QUOTE,
    AREA,
  ],
};
