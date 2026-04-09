"use client"

import { useEffect, useState } from "react"
import { Copy, Check, QrCode } from "lucide-react"
import QRCode from "qrcode"

interface PixQrCodeProps {
  pixKey: string
  merchantName: string
  merchantCity: string
}

function generatePixPayload(
  pixKey: string,
  merchantName: string,
  merchantCity: string,
): string {
  // Formato EMV do PIX (payload estático sem valor definido)
  function tlv(id: string, value: string): string {
    const len = value.length.toString().padStart(2, "0")
    return `${id}${len}${value}`
  }

  // Merchant Account Information (ID 26)
  const gui = tlv("00", "br.gov.bcb.pix")
  const key = tlv("01", pixKey)
  const merchantAccountInfo = tlv("26", gui + key)

  // Montar payload sem CRC
  let payload = ""
  payload += tlv("00", "01") // Payload Format Indicator
  payload += merchantAccountInfo // Merchant Account Info
  payload += tlv("52", "0000") // Merchant Category Code
  payload += tlv("53", "986") // Transaction Currency (BRL)
  payload += tlv("58", "BR") // Country Code
  payload += tlv("59", merchantName.substring(0, 25)) // Merchant Name
  payload += tlv("60", merchantCity.substring(0, 15)) // Merchant City
  payload += tlv("62", tlv("05", "***")) // Additional Data Field

  // CRC16-CCITT
  payload += "6304"
  const crc = crc16CCITT(payload)
  payload += crc

  return payload
}

function crc16CCITT(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
    }
    crc &= 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

export function PixQrCode({
  pixKey,
  merchantName,
  merchantCity,
}: PixQrCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [pixPayload, setPixPayload] = useState("")

  useEffect(() => {
    if (!pixKey) return

    const payload = generatePixPayload(pixKey, merchantName, merchantCity)
    setPixPayload(payload)

    QRCode.toDataURL(payload, {
      width: 200,
      margin: 2,
      color: { dark: "#0d1117", light: "#ffffff" },
    }).then(setQrDataUrl)
  }, [pixKey, merchantName, merchantCity])

  async function handleCopy() {
    await navigator.clipboard.writeText(pixPayload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!pixKey) return null

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <QrCode className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Apoie com PIX
        </h3>
      </div>

      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt="QR Code PIX"
          className="rounded-lg"
          width={200}
          height={200}
        />
      )}

      <p className="text-xs text-muted-foreground text-center">
        Escaneie o QR Code ou copie o codigo PIX abaixo para fazer uma doacao de
        qualquer valor.
      </p>

      <button
        onClick={handleCopy}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground transition-all duration-200 hover:border-primary hover:text-primary"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Copiado!
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copiar codigo PIX
          </>
        )}
      </button>
    </div>
  )
}
