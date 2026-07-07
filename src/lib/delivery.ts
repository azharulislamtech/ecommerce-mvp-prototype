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
