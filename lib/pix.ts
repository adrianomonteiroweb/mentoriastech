// Gerador do "copia e cola" (BR Code / EMV-MPM) de um PIX estatico, sem
// dependencia externa. Segue o Manual de Padroes para Iniciacao do PIX (Bacen):
// cada campo e um TLV no formato `ID(2) + tamanho(2) + valor`, e o payload
// termina com o CRC16-CCITT (poly 0x1021, init 0xFFFF) sobre todo o conteudo
// incluindo "6304".

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0")
  return `${id}${len}${value}`
}

function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

// Os campos 59/60 (nome/cidade) devem ser ASCII. NFD decompoe os acentos
// (ex.: "á" -> "a" + acento combinante) e o filtro abaixo mantem apenas ASCII
// imprimivel, removendo os acentos. Tambem limita o tamanho conforme a spec
// (nome <= 25, cidade <= 15).
function sanitize(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, maxLength)
}

export interface StaticPixParams {
  /** Chave PIX. Para CPF, use apenas digitos (ex.: "03440795381"). */
  key: string
  /** Nome do recebedor (campo 59), ate 25 caracteres. */
  merchantName: string
  /** Cidade do recebedor (campo 60), ate 15 caracteres. */
  merchantCity: string
  /** Identificador da transacao (campo 62/05). "***" para estatico sem txid. */
  txid?: string
}

/**
 * Monta o BR Code estatico (sem valor fixo — o pagador escolhe o valor no app
 * do banco). Retorna a string "copia e cola", pronta para virar QR Code.
 */
export function buildStaticPixPayload({
  key,
  merchantName,
  merchantCity,
  txid = "***",
}: StaticPixParams): string {
  const merchantAccountInfo =
    emvField("00", "br.gov.bcb.pix") + emvField("01", key)

  const additionalData = emvField("05", txid)

  const payload =
    emvField("00", "01") + // Payload Format Indicator
    emvField("26", merchantAccountInfo) + // Merchant Account Information - PIX
    emvField("52", "0000") + // Merchant Category Code
    emvField("53", "986") + // Transaction Currency (BRL)
    emvField("58", "BR") + // Country Code
    emvField("59", sanitize(merchantName, 25)) + // Merchant Name
    emvField("60", sanitize(merchantCity, 15)) + // Merchant City
    emvField("62", additionalData) + // Additional Data Field Template
    "6304" // CRC16: ID + tamanho; valor calculado a seguir sobre tudo acima

  return payload + crc16(payload)
}
