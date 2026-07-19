import { parsePhoneNumberFromString } from "libphonenumber-js/max"

const COUNTRY_TIMEZONES: Record<string, string> = {
  BR: "America/Sao_Paulo",
  PT: "Europe/Lisbon",
  CV: "Atlantic/Cape_Verde",
  AO: "Africa/Luanda",
  MZ: "Africa/Maputo",
  GW: "Africa/Bissau",
  ST: "Africa/Sao_Tome",
  TL: "Asia/Dili",
  AR: "America/Argentina/Buenos_Aires",
  CL: "America/Santiago",
  CO: "America/Bogota",
  PE: "America/Lima",
  VE: "America/Caracas",
  EC: "America/Guayaquil",
  BO: "America/La_Paz",
  PY: "America/Asuncion",
  UY: "America/Montevideo",
  MX: "America/Mexico_City",
  CR: "America/Costa_Rica",
  PA: "America/Panama",
  DO: "America/Santo_Domingo",
  GT: "America/Guatemala",
  HN: "America/Tegucigalpa",
  SV: "America/El_Salvador",
  NI: "America/Managua",
  CU: "America/Havana",
  HT: "America/Port-au-Prince",
  JM: "America/Jamaica",
  TT: "America/Port_of_Spain",
  SR: "America/Paramaribo",
  GY: "America/Guyana",
  BZ: "America/Belize",
  PR: "America/Puerto_Rico",
  US: "America/New_York",
  CA: "America/Toronto",
  GB: "Europe/London",
  FR: "Europe/Paris",
  DE: "Europe/Berlin",
  ES: "Europe/Madrid",
  IT: "Europe/Rome",
  NL: "Europe/Amsterdam",
  BE: "Europe/Brussels",
  CH: "Europe/Zurich",
  AT: "Europe/Vienna",
  IE: "Europe/Dublin",
  SE: "Europe/Stockholm",
  NO: "Europe/Oslo",
  DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki",
  PL: "Europe/Warsaw",
  CZ: "Europe/Prague",
  RO: "Europe/Bucharest",
  HU: "Europe/Budapest",
  GR: "Europe/Athens",
  BG: "Europe/Sofia",
  HR: "Europe/Zagreb",
  SK: "Europe/Bratislava",
  UA: "Europe/Kiev",
  RU: "Europe/Moscow",
  TR: "Europe/Istanbul",
  LU: "Europe/Luxembourg",
  LT: "Europe/Vilnius",
  LV: "Europe/Riga",
  EE: "Europe/Tallinn",
  SI: "Europe/Ljubljana",
  RS: "Europe/Belgrade",
  ZA: "Africa/Johannesburg",
  NG: "Africa/Lagos",
  KE: "Africa/Nairobi",
  GH: "Africa/Accra",
  TZ: "Africa/Dar_es_Salaam",
  ET: "Africa/Addis_Ababa",
  EG: "Africa/Cairo",
  MA: "Africa/Casablanca",
  SN: "Africa/Dakar",
  CI: "Africa/Abidjan",
  CM: "Africa/Douala",
  CD: "Africa/Kinshasa",
  UG: "Africa/Kampala",
  TN: "Africa/Tunis",
  DZ: "Africa/Algiers",
  RW: "Africa/Kigali",
  JP: "Asia/Tokyo",
  CN: "Asia/Shanghai",
  KR: "Asia/Seoul",
  IN: "Asia/Kolkata",
  PH: "Asia/Manila",
  TH: "Asia/Bangkok",
  VN: "Asia/Ho_Chi_Minh",
  SG: "Asia/Singapore",
  MY: "Asia/Kuala_Lumpur",
  ID: "Asia/Jakarta",
  IL: "Asia/Jerusalem",
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  QA: "Asia/Qatar",
  PK: "Asia/Karachi",
  BD: "Asia/Dhaka",
  LK: "Asia/Colombo",
  NP: "Asia/Kathmandu",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
}

const COUNTRY_NAMES_PT: Record<string, string> = {
  BR: "Brasil",
  PT: "Portugal",
  CV: "Cabo Verde",
  AO: "Angola",
  MZ: "Moçambique",
  GW: "Guiné-Bissau",
  ST: "São Tomé e Príncipe",
  TL: "Timor-Leste",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colômbia",
  PE: "Peru",
  VE: "Venezuela",
  EC: "Equador",
  BO: "Bolívia",
  PY: "Paraguai",
  UY: "Uruguai",
  MX: "México",
  CR: "Costa Rica",
  PA: "Panamá",
  DO: "República Dominicana",
  GT: "Guatemala",
  HN: "Honduras",
  SV: "El Salvador",
  NI: "Nicarágua",
  CU: "Cuba",
  HT: "Haiti",
  JM: "Jamaica",
  TT: "Trinidad e Tobago",
  SR: "Suriname",
  GY: "Guiana",
  BZ: "Belize",
  PR: "Porto Rico",
  US: "Estados Unidos",
  CA: "Canadá",
  GB: "Reino Unido",
  FR: "França",
  DE: "Alemanha",
  ES: "Espanha",
  IT: "Itália",
  NL: "Países Baixos",
  BE: "Bélgica",
  CH: "Suíça",
  AT: "Áustria",
  IE: "Irlanda",
  SE: "Suécia",
  NO: "Noruega",
  DK: "Dinamarca",
  FI: "Finlândia",
  PL: "Polônia",
  CZ: "República Tcheca",
  RO: "Romênia",
  HU: "Hungria",
  GR: "Grécia",
  BG: "Bulgária",
  HR: "Croácia",
  SK: "Eslováquia",
  UA: "Ucrânia",
  RU: "Rússia",
  TR: "Turquia",
  LU: "Luxemburgo",
  LT: "Lituânia",
  LV: "Letônia",
  EE: "Estônia",
  SI: "Eslovênia",
  RS: "Sérvia",
  ZA: "África do Sul",
  NG: "Nigéria",
  KE: "Quênia",
  GH: "Gana",
  TZ: "Tanzânia",
  ET: "Etiópia",
  EG: "Egito",
  MA: "Marrocos",
  SN: "Senegal",
  CI: "Costa do Marfim",
  CM: "Camarões",
  CD: "Congo",
  UG: "Uganda",
  TN: "Tunísia",
  DZ: "Argélia",
  RW: "Ruanda",
  JP: "Japão",
  CN: "China",
  KR: "Coreia do Sul",
  IN: "Índia",
  PH: "Filipinas",
  TH: "Tailândia",
  VN: "Vietnã",
  SG: "Singapura",
  MY: "Malásia",
  ID: "Indonésia",
  IL: "Israel",
  AE: "Emirados Árabes",
  SA: "Arábia Saudita",
  QA: "Catar",
  PK: "Paquistão",
  BD: "Bangladesh",
  LK: "Sri Lanka",
  NP: "Nepal",
  AU: "Austrália",
  NZ: "Nova Zelândia",
}

export const BRAZIL_TIMEZONE = "America/Sao_Paulo"

export function getCountryFromPhone(phone: string): string | null {
  if (!phone) return null
  const parsed = parsePhoneNumberFromString(phone)
  return parsed?.country || null
}

export function getTimezoneForCountry(country: string): string | null {
  return COUNTRY_TIMEZONES[country.toUpperCase()] || null
}

export function getTimezoneFromPhone(phone: string): string | null {
  const country = getCountryFromPhone(phone)
  if (!country) return null
  return getTimezoneForCountry(country)
}

export function isInternationalPhone(phone: string): boolean {
  const country = getCountryFromPhone(phone)
  return Boolean(country && country !== "BR")
}

export function getCountryNamePT(country: string): string {
  return COUNTRY_NAMES_PT[country.toUpperCase()] || country.toUpperCase()
}

function getUtcOffsetMinutes(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0")

  let hour = get("hour")
  if (hour === 24) hour = 0

  const localAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  )

  return Math.round((localAsUtc - date.getTime()) / 60000)
}

export function convertBrazilTimeToTimezone(
  date: string,
  time: string,
  targetTimezone: string,
): string | null {
  try {
    const [h, m] = time.substring(0, 5).split(":").map(Number)
    const refUtc = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`)

    const brOffset = getUtcOffsetMinutes(refUtc, BRAZIL_TIMEZONE)
    const targetOffset = getUtcOffsetMinutes(refUtc, targetTimezone)
    const diffMinutes = targetOffset - brOffset

    const totalMinutes = h * 60 + m + diffMinutes
    const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440

    return `${String(Math.floor(normalizedMinutes / 60)).padStart(2, "0")}:${String(normalizedMinutes % 60).padStart(2, "0")}`
  } catch {
    return null
  }
}

export interface TimezoneDisplay {
  isInternational: true
  countryName: string
  localTime: string | null
  label: string
}

export function getTimezoneDisplay(
  whatsapp: string | undefined | null,
  sessionDate?: string | null,
  startTime?: string | null,
): TimezoneDisplay | null {
  if (!whatsapp) return null

  const country = getCountryFromPhone(whatsapp)
  if (!country || country === "BR") return null

  const timezone = getTimezoneForCountry(country)
  if (!timezone) return null

  const countryName = getCountryNamePT(country)

  if (!sessionDate || !startTime) {
    return {
      isInternational: true,
      countryName,
      localTime: null,
      label: `Horários informados no horário de Brasília`,
    }
  }

  const localTime = convertBrazilTimeToTimezone(sessionDate, startTime, timezone)
  const brTime = startTime.substring(0, 5)

  if (localTime && localTime !== brTime) {
    return {
      isInternational: true,
      countryName,
      localTime,
      label: `${brTime} (Brasília) · ${localTime} (${countryName})`,
    }
  }

  return {
    isInternational: true,
    countryName,
    localTime: brTime,
    label: `${brTime} (Brasília / ${countryName})`,
  }
}
