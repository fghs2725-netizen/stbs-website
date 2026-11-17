/*
 * Occasions the WhatsApp status maker offers, with a greeting and two lines in English and Hindi.
 *
 * Festivals that follow the lunar calendar have no formula here: their dates are listed year by
 * year in `dates`, checked against published calendars (Drik Panchang for 2026; the 2027 gazetted
 * holiday lists). An occasion with no date for a year is simply not offered that year, so each
 * year's dates have to be added. `npm run test:status` fails once fewer than six months of
 * festival dates are left.
 */

export type StatusLang = "en" | "hi";

export type Occasion = {
  id: string;
  /** Name in the picker. */
  name: string;
  /** Fixed day every year, as "MM-DD". */
  day?: string;
  /** Dates by year, as "MM-DD", for festivals that move. */
  dates?: Record<number, string>;
  /** The date depends on a moon sighting and can shift by a day. */
  tentative?: boolean;
  title: Record<StatusLang, string>;
  /** First line is a plain greeting; the second ties the day to water or to the work. */
  lines: Record<StatusLang, [string, string]>;
};

const o = (
  id: string, name: string, when: string | Record<number, string>,
  titleEn: string, titleHi: string, en: [string, string], hi: [string, string], tentative = false,
): Occasion => ({
  id, name, ...(typeof when === "string" ? { day: when } : { dates: when }), ...(tentative ? { tentative } : {}),
  title: { en: titleEn, hi: titleHi }, lines: { en, hi },
});

export const OCCASIONS: Occasion[] = [
  o("new-year", "New Year", "01-01", "Happy New Year", "नव वर्ष की हार्दिक शुभकामनाएँ",
    ["Wishing you a year of good health, steady growth and success.", "May the new year bring water and prosperity to every home and field."],
    ["नया साल आपके जीवन में सुख, समृद्धि और सफलता लाए।", "नए साल में हर घर और हर खेत तक पानी और खुशहाली पहुँचे।"]),
  o("lohri", "Lohri", "01-13", "Happy Lohri", "लोहड़ी की लख-लख बधाइयाँ",
    ["May the Lohri fire bring warmth, joy and a good harvest.", "Wishing every farmer full fields and a rich harvest this Lohri."],
    ["लोहड़ी की आग आपके जीवन में खुशियाँ और समृद्धि लाए।", "हर किसान के खेत लहलहाएँ, फसल भरपूर हो।"]),
  o("republic-day", "Republic Day", "01-26", "Happy Republic Day", "गणतंत्र दिवस की हार्दिक शुभकामनाएँ",
    ["Proud to be Indian. Proud to build for India.", "Saluting the nation we are proud to serve, one borewell at a time."],
    ["हमें गर्व है कि हम भारतीय हैं।", "देश की सेवा में, हर बोरवेल के साथ।"]),
  o("basant-panchami", "Basant Panchami", { 2027: "02-11" }, "Happy Basant Panchami", "बसंत पंचमी की हार्दिक शुभकामनाएँ",
    ["May the season of spring bring knowledge, colour and new beginnings.", "Wishing green fields and a bright season to every farmer."],
    ["बसंत का यह पर्व आपके जीवन में ज्ञान और खुशियाँ लाए।", "हर खेत में हरियाली और हर घर में खुशहाली हो।"]),
  o("maha-shivratri", "Maha Shivratri", { 2027: "03-06" }, "Happy Maha Shivratri", "महाशिवरात्रि की हार्दिक शुभकामनाएँ",
    ["May Lord Shiva bless you with strength, peace and prosperity.", "Har Har Mahadev. May every home be blessed."],
    ["भोलेनाथ की कृपा आप पर सदा बनी रहे।", "हर हर महादेव। हर घर में सुख और शांति हो।"]),
  o("eid", "Eid-ul-Fitr", { 2027: "03-10" }, "Eid Mubarak", "ईद मुबारक",
    ["Wishing you and your family peace, happiness and togetherness.", "May this Eid bring joy and prosperity to every home."],
    ["आपको और आपके परिवार को ईद की दिली मुबारकबाद।", "यह ईद हर घर में खुशियाँ और बरकत लाए।"], true),
  o("holi", "Holi", { 2027: "03-22" }, "Happy Holi", "होली की हार्दिक शुभकामनाएँ",
    ["May your life be filled with the colours of joy and togetherness.", "Play with colours, save water. Wishing you a happy and safe Holi."],
    ["रंगों का यह त्योहार आपके जीवन में खुशियाँ भर दे।", "रंगों से खेलें, पानी बचाएँ। सुरक्षित होली मनाएँ।"]),
  o("world-water-day", "World Water Day", "03-22", "World Water Day", "विश्व जल दिवस",
    ["Every drop counts. Use water wisely, today and every day.", "Groundwater is our shared wealth. Recharge it, protect it, respect it."],
    ["जल है तो कल है। पानी की हर बूँद कीमती है।", "भूजल हमारी साझा संपत्ति है। इसे बचाएँ, इसे रिचार्ज करें।"]),
  o("baisakhi", "Baisakhi", { 2027: "04-14" }, "Happy Baisakhi", "बैसाखी की लख-लख बधाइयाँ",
    ["Wishing you a season of joy, harvest and new beginnings.", "Saluting the farmers whose hard work feeds the nation."],
    ["बैसाखी का यह पर्व आपके जीवन में खुशियाँ और समृद्धि लाए।", "अन्नदाता किसान को हमारा नमन।"]),
  o("earth-day", "Earth Day", "04-22", "Earth Day", "पृथ्वी दिवस",
    ["One Earth. Let us care for its soil, its water and its future.", "Recharge the ground that gives us water. Harvest every drop of rain."],
    ["धरती हमारी माँ है, इसकी रक्षा हमारा कर्तव्य है।", "बारिश की हर बूँद सहेजें, धरती को रिचार्ज करें।"]),
  o("labour-day", "Labour Day", "05-01", "Happy Labour Day", "मज़दूर दिवस की हार्दिक शुभकामनाएँ",
    ["Saluting the hands that build the nation.", "Thank you to our crews, whose hard work brings water to every site."],
    ["देश को बनाने वाले हर मेहनती हाथ को सलाम।", "हमारी टीम को धन्यवाद, जिनकी मेहनत से हर साइट तक पानी पहुँचता है।"]),
  o("environment-day", "World Environment Day", "06-05", "World Environment Day", "विश्व पर्यावरण दिवस",
    ["Plant a tree, save water, protect tomorrow.", "Harvest the rain and recharge the ground. Small steps, lasting water."],
    ["पेड़ लगाएँ, पानी बचाएँ, कल को सुरक्षित बनाएँ।", "वर्षा जल सहेजें, भूजल बढ़ाएँ।"]),
  o("independence-day", "Independence Day", "08-15", "Happy Independence Day", "स्वतंत्रता दिवस की हार्दिक शुभकामनाएँ",
    ["Saluting the nation and everyone who builds it. Jai Hind.", "Proud to serve the farms, homes and industries of our nation. Jai Hind."],
    ["आज़ादी का यह पर्व आप सभी को मुबारक। जय हिंद।", "देश के खेतों, घरों और उद्योगों की सेवा में। जय हिंद।"]),
  o("raksha-bandhan", "Raksha Bandhan", { 2027: "08-17" }, "Happy Raksha Bandhan", "रक्षाबंधन की हार्दिक शुभकामनाएँ",
    ["Celebrating the bond of love, trust and protection.", "A bond built on trust lasts a lifetime. Happy Raksha Bandhan."],
    ["भाई-बहन के प्यार का यह पर्व आपको मुबारक।", "विश्वास का बंधन सबसे मज़बूत होता है।"]),
  o("janmashtami", "Janmashtami", { 2027: "08-25" }, "Happy Janmashtami", "जन्माष्टमी की हार्दिक शुभकामनाएँ",
    ["May Lord Krishna bless you with joy, love and prosperity.", "Jai Shri Krishna. May every home be filled with happiness."],
    ["श्री कृष्ण की कृपा आप पर सदा बनी रहे।", "जय श्री कृष्ण। हर घर में खुशियाँ हों।"]),
  o("ganesh-chaturthi", "Ganesh Chaturthi", { 2027: "09-04" }, "Happy Ganesh Chaturthi", "गणेश चतुर्थी की हार्दिक शुभकामनाएँ",
    ["May Lord Ganesha remove every obstacle and bless every new beginning.", "Ganpati Bappa Morya. Wishing success to every new project."],
    ["विघ्नहर्ता गणेश आपके सभी कार्य सफल करें।", "गणपति बप्पा मोरया। हर नए काम में सफलता मिले।"]),
  o("teachers-day", "Teachers' Day", "09-05", "Happy Teachers' Day", "शिक्षक दिवस की हार्दिक शुभकामनाएँ",
    ["Thank you to every teacher who lights the way.", "Grateful to everyone who taught us our craft."],
    ["ज्ञान की राह दिखाने वाले हर शिक्षक को नमन।", "जिन्होंने हमें हमारा काम सिखाया, उन सभी गुरुओं को प्रणाम।"]),
  o("engineers-day", "Engineers' Day", "09-15", "Happy Engineers' Day", "अभियंता दिवस की हार्दिक शुभकामनाएँ",
    ["Saluting the engineers who design and build our future.", "To the engineers we work with on every site: thank you."],
    ["देश का भविष्य गढ़ने वाले सभी इंजीनियरों को सलाम।", "हर साइट पर हमारे साथ काम करने वाले इंजीनियरों को धन्यवाद।"]),
  o("vishwakarma-puja", "Vishwakarma Puja", "09-17", "Happy Vishwakarma Puja", "विश्वकर्मा पूजा की हार्दिक शुभकामनाएँ",
    ["May Lord Vishwakarma bless your work, tools and machines.", "We bow to our rigs and tools, and to the hands that run them."],
    ["भगवान विश्वकर्मा आपके काम और कारोबार में तरक्की दें।", "हमारी मशीनों, औज़ारों और मेहनती हाथों को नमन।"]),
  o("gandhi-jayanti", "Gandhi Jayanti", "10-02", "Gandhi Jayanti", "गांधी जयंती",
    ["Remembering the Mahatma and his path of truth and simplicity.", "Honest work is the truest service. Remembering Bapu."],
    ["सत्य और अहिंसा के पुजारी बापू को शत-शत नमन।", "ईमानदारी से किया गया काम ही सच्ची सेवा है।"]),
  o("dussehra", "Dussehra", { 2027: "10-09" }, "Happy Dussehra", "दशहरा की हार्दिक शुभकामनाएँ",
    ["May good always win over evil. Wishing you a joyful Vijayadashami.", "Wishing you victory in every effort and success in every project."],
    ["बुराई पर अच्छाई की जीत का यह पर्व आपको मुबारक।", "हर काम में विजय और हर प्रयास में सफलता मिले।"]),
  o("karwa-chauth", "Karwa Chauth", { 2027: "10-18" }, "Happy Karwa Chauth", "करवा चौथ की हार्दिक शुभकामनाएँ",
    ["Celebrating love, faith and togetherness.", "Wishing every family happiness and a long life together."],
    ["प्रेम और विश्वास का यह पर्व आपको मुबारक।", "हर परिवार में सुख और साथ बना रहे।"]),
  o("diwali", "Diwali", { 2027: "10-29" }, "Happy Diwali", "दीपावली की हार्दिक शुभकामनाएँ",
    ["May the festival of lights bring happiness, health and prosperity.", "Thank you for your trust. Wishing you a bright and prosperous Diwali."],
    ["दीपों का यह पर्व आपके जीवन में सुख और समृद्धि लाए।", "आपके विश्वास के लिए धन्यवाद। शुभ दीपावली।"]),
  o("haryana-day", "Haryana Day", "11-01", "Happy Haryana Day", "हरियाणा दिवस की हार्दिक शुभकामनाएँ",
    ["Proud of our land, our farmers and our people.", "Proud to serve Haryana's farms and industries since 1992."],
    ["हमें अपनी धरती, अपने किसान और अपने जवान पर गर्व है।", "1992 से हरियाणा के खेतों और उद्योगों की सेवा में।"]),
  o("guru-nanak-jayanti", "Guru Nanak Jayanti", { 2026: "11-24", 2027: "11-14" }, "Happy Gurpurab", "गुरु नानक जयंती की लख-लख बधाइयाँ",
    ["May Guru Nanak Dev Ji's teachings guide us towards truth and service.", "Honest work and sharing with all. Wishing you a blessed Gurpurab."],
    ["गुरु नानक देव जी की शिक्षाएँ हमें सच्चाई की राह दिखाएँ।", "किरत करो, वंड छको। गुरुपर्व की बधाई।"]),
  o("childrens-day", "Children's Day", "11-14", "Happy Children's Day", "बाल दिवस की हार्दिक शुभकामनाएँ",
    ["Every child deserves a happy and healthy tomorrow.", "Save water today, for the children of tomorrow."],
    ["हर बच्चे का कल खुशहाल और सुरक्षित हो।", "आज पानी बचाएँ, बच्चों का कल सँवारें।"]),
  o("kisan-diwas", "Farmers' Day", "12-23", "National Farmers' Day", "किसान दिवस की हार्दिक शुभकामनाएँ",
    ["Saluting the farmers who feed the nation.", "Proud to stand with our farmers, bringing water to their fields."],
    ["देश का पेट भरने वाले अन्नदाता को नमन।", "किसान के खेत तक पानी पहुँचाना हमारा गर्व है।"]),
  o("christmas", "Christmas", "12-25", "Merry Christmas", "क्रिसमस की हार्दिक शुभकामनाएँ",
    ["Wishing you peace, joy and happiness this Christmas.", "Wishing you and your family a season of warmth and togetherness."],
    ["क्रिसमस का यह पर्व आपके जीवन में खुशियाँ लाए।", "आपको और आपके परिवार को ढेर सारी शुभकामनाएँ।"]),
];

/** A story for any day: the owner types the greeting. */
export const CUSTOM_OCCASION: Occasion = {
  id: "custom", name: "Other (type your own)",
  title: { en: "Good Morning", hi: "सुप्रभात" },
  lines: {
    en: ["Wishing you a good day ahead.", "Drilling deep. Building trust."],
    hi: ["आपका दिन शुभ हो।", "पानी की हर बूँद कीमती है।"],
  },
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in India as "YYYY-MM-DD", whatever the device's own time zone. */
export function todayInIndia(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

/** The occasion's date in `year` as "YYYY-MM-DD", or null when that year's date is not listed. */
export function occasionDate(occasion: Occasion, year: number): string | null {
  const day = occasion.day ?? occasion.dates?.[year];
  return day ? `${year}-${day}` : null;
}

export type DatedOccasion = { occasion: Occasion; date: string; daysAway: number };

const dayNumber = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86_400_000;

/** Occasions from `today` onwards, soonest first, within `withinDays`. Today's own occasions come first. */
export function upcomingOccasions(today: string, withinDays = 366): DatedOccasion[] {
  const year = Number(today.slice(0, 4));
  const out: DatedOccasion[] = [];
  for (const occasion of OCCASIONS) {
    for (const y of [year, year + 1]) {
      const date = occasionDate(occasion, y);
      if (!date) continue;
      const daysAway = dayNumber(date) - dayNumber(today);
      if (daysAway >= 0 && daysAway < withinDays) { out.push({ occasion, date, daysAway }); break; }
    }
  }
  return out.sort((a, b) => a.daysAway - b.daysAway);
}

/** "14 Nov" for the picker. */
export function shortDate(iso: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(iso.slice(8, 10))} ${months[Number(iso.slice(5, 7)) - 1]}`;
}

export function whenLabel(d: DatedOccasion): string {
  if (d.daysAway === 0) return "Today";
  if (d.daysAway === 1) return "Tomorrow";
  return shortDate(d.date);
}
