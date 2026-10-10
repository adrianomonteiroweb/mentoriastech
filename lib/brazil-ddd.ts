export interface DddInfo {
  state: string
  name: string
}

export const DDD_TO_STATE: Record<string, DddInfo> = {
  "11": { state: "SP", name: "São Paulo" },
  "12": { state: "SP", name: "São Paulo" },
  "13": { state: "SP", name: "São Paulo" },
  "14": { state: "SP", name: "São Paulo" },
  "15": { state: "SP", name: "São Paulo" },
  "16": { state: "SP", name: "São Paulo" },
  "17": { state: "SP", name: "São Paulo" },
  "18": { state: "SP", name: "São Paulo" },
  "19": { state: "SP", name: "São Paulo" },
  "21": { state: "RJ", name: "Rio de Janeiro" },
  "22": { state: "RJ", name: "Rio de Janeiro" },
  "24": { state: "RJ", name: "Rio de Janeiro" },
  "27": { state: "ES", name: "Espírito Santo" },
  "28": { state: "ES", name: "Espírito Santo" },
  "31": { state: "MG", name: "Minas Gerais" },
  "32": { state: "MG", name: "Minas Gerais" },
  "33": { state: "MG", name: "Minas Gerais" },
  "34": { state: "MG", name: "Minas Gerais" },
  "35": { state: "MG", name: "Minas Gerais" },
  "37": { state: "MG", name: "Minas Gerais" },
  "38": { state: "MG", name: "Minas Gerais" },
  "41": { state: "PR", name: "Paraná" },
  "42": { state: "PR", name: "Paraná" },
  "43": { state: "PR", name: "Paraná" },
  "44": { state: "PR", name: "Paraná" },
  "45": { state: "PR", name: "Paraná" },
  "46": { state: "PR", name: "Paraná" },
  "47": { state: "SC", name: "Santa Catarina" },
  "48": { state: "SC", name: "Santa Catarina" },
  "49": { state: "SC", name: "Santa Catarina" },
  "51": { state: "RS", name: "Rio Grande do Sul" },
  "53": { state: "RS", name: "Rio Grande do Sul" },
  "54": { state: "RS", name: "Rio Grande do Sul" },
  "55": { state: "RS", name: "Rio Grande do Sul" },
  "61": { state: "DF", name: "Distrito Federal" },
  "62": { state: "GO", name: "Goiás" },
  "64": { state: "GO", name: "Goiás" },
  "63": { state: "TO", name: "Tocantins" },
  "65": { state: "MT", name: "Mato Grosso" },
  "66": { state: "MT", name: "Mato Grosso" },
  "67": { state: "MS", name: "Mato Grosso do Sul" },
  "68": { state: "AC", name: "Acre" },
  "69": { state: "RO", name: "Rondônia" },
  "71": { state: "BA", name: "Bahia" },
  "73": { state: "BA", name: "Bahia" },
  "74": { state: "BA", name: "Bahia" },
  "75": { state: "BA", name: "Bahia" },
  "77": { state: "BA", name: "Bahia" },
  "79": { state: "SE", name: "Sergipe" },
  "81": { state: "PE", name: "Pernambuco" },
  "87": { state: "PE", name: "Pernambuco" },
  "82": { state: "AL", name: "Alagoas" },
  "83": { state: "PB", name: "Paraíba" },
  "84": { state: "RN", name: "Rio Grande do Norte" },
  "85": { state: "CE", name: "Ceará" },
  "88": { state: "CE", name: "Ceará" },
  "86": { state: "PI", name: "Piauí" },
  "89": { state: "PI", name: "Piauí" },
  "91": { state: "PA", name: "Pará" },
  "93": { state: "PA", name: "Pará" },
  "94": { state: "PA", name: "Pará" },
  "92": { state: "AM", name: "Amazonas" },
  "97": { state: "AM", name: "Amazonas" },
  "95": { state: "RR", name: "Roraima" },
  "96": { state: "AP", name: "Amapá" },
  "98": { state: "MA", name: "Maranhão" },
  "99": { state: "MA", name: "Maranhão" },
}

export function extractDddFromBrazilianNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")
  if (digits.startsWith("55") && digits.length >= 12) {
    return digits.slice(2, 4)
  }
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    return digits.slice(0, 2)
  }
  return null
}

export function isBrazilianNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "")
  return digits.startsWith("55") || digits.length === 10 || digits.length === 11
}

export const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  BR: "Brasil",
  PT: "Portugal",
  FR: "França",
  JP: "Japão",
  ES: "Espanha",
  US: "Estados Unidos",
  CA: "Canadá",
  DE: "Alemanha",
  GB: "Reino Unido",
  IT: "Itália",
  NL: "Países Baixos",
  IE: "Irlanda",
  AU: "Austrália",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colômbia",
  MX: "México",
  UY: "Uruguai",
  PE: "Peru",
  IN: "Índia",
  IL: "Israel",
  AE: "Emirados Árabes",
  SE: "Suécia",
  NO: "Noruega",
  DK: "Dinamarca",
  FI: "Finlândia",
  CH: "Suíça",
  AT: "Áustria",
  BE: "Bélgica",
  PL: "Polônia",
  CZ: "República Tcheca",
  RO: "Romênia",
  HU: "Hungria",
  NZ: "Nova Zelândia",
  SG: "Singapura",
  KR: "Coreia do Sul",
  CN: "China",
  TW: "Taiwan",
  AO: "Angola",
  MZ: "Moçambique",
  CV: "Cabo Verde",
}

export function getCountryName(countryCode: string): string {
  return COUNTRY_CODE_TO_NAME[countryCode] || countryCode
}
