export const DHAKA_DISTRICT = "Dhaka";
export const DHAKA_DELIVERY_CHARGE = 60;
export const OUTSIDE_DHAKA_DELIVERY_CHARGE = 120;
export const DEFAULT_DELIVERY_CHARGE = DHAKA_DELIVERY_CHARGE;

export const districts = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapainawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokati",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon"
] as const;

export type BangladeshDistrict = (typeof districts)[number];

function normalizeDistrict(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const districtByNormalizedName = new Map(districts.map((district) => [normalizeDistrict(district), district]));

export function getCanonicalDistrict(value: string) {
  return districtByNormalizedName.get(normalizeDistrict(value)) ?? null;
}

// Bangla display names. The database and the checkout RPC keep the English names,
// so these are used for display only (option text, tracking page).
export const districtLabels: Record<BangladeshDistrict, string> = {
  Bagerhat: "বাগেরহাট",
  Bandarban: "বান্দরবান",
  Barguna: "বরগুনা",
  Barishal: "বরিশাল",
  Bhola: "ভোলা",
  Bogura: "বগুড়া",
  Brahmanbaria: "ব্রাহ্মণবাড়িয়া",
  Chandpur: "চাঁদপুর",
  Chapainawabganj: "চাঁপাইনবাবগঞ্জ",
  Chattogram: "চট্টগ্রাম",
  Chuadanga: "চুয়াডাঙ্গা",
  "Cox's Bazar": "কক্সবাজার",
  Cumilla: "কুমিল্লা",
  Dhaka: "ঢাকা",
  Dinajpur: "দিনাজপুর",
  Faridpur: "ফরিদপুর",
  Feni: "ফেনী",
  Gaibandha: "গাইবান্ধা",
  Gazipur: "গাজীপুর",
  Gopalganj: "গোপালগঞ্জ",
  Habiganj: "হবিগঞ্জ",
  Jamalpur: "জামালপুর",
  Jashore: "যশোর",
  Jhalokati: "ঝালকাঠি",
  Jhenaidah: "ঝিনাইদহ",
  Joypurhat: "জয়পুরহাট",
  Khagrachhari: "খাগড়াছড়ি",
  Khulna: "খুলনা",
  Kishoreganj: "কিশোরগঞ্জ",
  Kurigram: "কুড়িগ্রাম",
  Kushtia: "কুষ্টিয়া",
  Lakshmipur: "লক্ষ্মীপুর",
  Lalmonirhat: "লালমনিরহাট",
  Madaripur: "মাদারীপুর",
  Magura: "মাগুরা",
  Manikganj: "মানিকগঞ্জ",
  Meherpur: "মেহেরপুর",
  Moulvibazar: "মৌলভীবাজার",
  Munshiganj: "মুন্সীগঞ্জ",
  Mymensingh: "ময়মনসিংহ",
  Naogaon: "নওগাঁ",
  Narail: "নড়াইল",
  Narayanganj: "নারায়ণগঞ্জ",
  Narsingdi: "নরসিংদী",
  Natore: "নাটোর",
  Netrokona: "নেত্রকোনা",
  Nilphamari: "নীলফামারী",
  Noakhali: "নোয়াখালী",
  Pabna: "পাবনা",
  Panchagarh: "পঞ্চগড়",
  Patuakhali: "পটুয়াখালী",
  Pirojpur: "পিরোজপুর",
  Rajbari: "রাজবাড়ী",
  Rajshahi: "রাজশাহী",
  Rangamati: "রাঙ্গামাটি",
  Rangpur: "রংপুর",
  Satkhira: "সাতক্ষীরা",
  Shariatpur: "শরীয়তপুর",
  Sherpur: "শেরপুর",
  Sirajganj: "সিরাজগঞ্জ",
  Sunamganj: "সুনামগঞ্জ",
  Sylhet: "সিলেট",
  Tangail: "টাঙ্গাইল",
  Thakurgaon: "ঠাকুরগাঁও"
};

export function districtLabel(value: string) {
  const district = getCanonicalDistrict(value);
  return district ? districtLabels[district] : value;
}

// Dhaka first (most orders), then the rest in Bangla alphabetical order.
export const districtOptions = [...districts]
  .sort((a, b) => (a === DHAKA_DISTRICT ? -1 : b === DHAKA_DISTRICT ? 1 : districtLabels[a].localeCompare(districtLabels[b], "bn")))
  .map((value) => ({ value, label: districtLabels[value] }));

export function isSupportedDistrict(value: string) {
  return getCanonicalDistrict(value) !== null;
}

export function getDeliveryChargeForDistrict(value?: string | null) {
  const district = value ? getCanonicalDistrict(value) : null;

  if (!district) {
    return DEFAULT_DELIVERY_CHARGE;
  }

  return district === DHAKA_DISTRICT ? DHAKA_DELIVERY_CHARGE : OUTSIDE_DHAKA_DELIVERY_CHARGE;
}
