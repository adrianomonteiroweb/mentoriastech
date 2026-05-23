export const MENTOR_EMAIL = process.env.MENTOR_EMAIL || "adrianomonteiroweb@gmail.com"
export const MENTOR_WHATSAPP = "5585986663753"
export const MENTOR_NAME = "Adriano Monteiro"

export function buildWhatsAppCorrectionLink(opts: {
  bookingDate?: string | null
  topicName?: string | null
}) {
  const dateStr = opts.bookingDate
    ? opts.bookingDate.split("-").reverse().join("/")
    : "sem data"
  const topic = opts.topicName || "minha mentoria"
  const message = `Olá, Adriano! Revisando as anotações da mentoria sobre "${topic}" do dia ${dateStr}, identifiquei um ponto que gostaria de corrigir ou esclarecer:`
  return `https://wa.me/${MENTOR_WHATSAPP}?text=${encodeURIComponent(message)}`
}

export function buildEmailCorrectionLink(opts: {
  bookingDate?: string | null
  topicName?: string | null
}) {
  const dateStr = opts.bookingDate
    ? opts.bookingDate.split("-").reverse().join("/")
    : "sem data"
  const topic = opts.topicName || "minha mentoria"
  const subject = `Correção das anotações - Mentoria ${dateStr}`
  const body = `Olá, Adriano!\n\nRevisando as anotações da mentoria sobre "${topic}" do dia ${dateStr}, identifiquei um ponto que gostaria de corrigir ou esclarecer:\n\n[descreva aqui o que precisa de revisão]\n\nObrigado!`
  return `mailto:${MENTOR_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
