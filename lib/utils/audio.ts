/**
 * Blobs do MediaRecorder (WebM) não gravam duração nos metadados, então
 * <audio> reporta duration === Infinity e o player nativo mostra 0:00 / 0:00
 * e não permite tocar/seek. Forçar um seek para um tempo enorme faz o
 * navegador ler até o fim e calcular a duração real; depois voltamos ao início.
 * Fallback para áudios ANTIGOS (gravados antes da conversão p/ WAV).
 * Anexar em <audio onLoadedMetadata={(e) => fixInfiniteAudioDuration(e.currentTarget)} />.
 */
export function fixInfiniteAudioDuration(audio: HTMLAudioElement) {
  if (audio.duration !== Infinity && !Number.isNaN(audio.duration)) return
  const onTimeUpdate = () => {
    audio.removeEventListener("timeupdate", onTimeUpdate)
    audio.currentTime = 0
  }
  audio.addEventListener("timeupdate", onTimeUpdate)
  audio.currentTime = 1e101
}

/**
 * Converte um Blob de áudio gravado (WebM/Opus, MP4/AAC, OGG, etc.) em WAV
 * (PCM 16-bit, mono). WAV sempre tem a duração no header, é seekável e toca em
 * qualquer navegador — resolve de vez gravações do MediaRecorder que não
 * reproduzem. Faz downmix p/ mono e resample p/ `sampleRate` (16kHz, ótimo p/
 * voz e mantém o arquivo pequeno). Lança erro se o áudio não puder ser
 * decodificado (ex.: microfone não capturou nada).
 */
export async function blobToWav(
  blob: Blob,
  sampleRate = 16000,
): Promise<{ blob: Blob; durationSeconds: number }> {
  const arrayBuffer = await blob.arrayBuffer()

  const AudioCtx: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const decodeCtx = new AudioCtx()
  let decoded: AudioBuffer
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer)
  } finally {
    void decodeCtx.close()
  }

  // Downmix p/ mono + resample para sampleRate via OfflineAudioContext.
  const frameCount = Math.max(1, Math.ceil(decoded.duration * sampleRate))
  const offline = new OfflineAudioContext(1, frameCount, sampleRate)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()

  return { blob: encodeWav(rendered), durationSeconds: rendered.duration }
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = 1
  const { sampleRate } = buffer
  const samples = buffer.getChannelData(0)
  const dataSize = samples.length * 2
  const out = new ArrayBuffer(44 + dataSize)
  const view = new DataView(out)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true) // tamanho do chunk fmt
  view.setUint16(20, 1, true) // formato PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true) // byte rate
  view.setUint16(32, numChannels * 2, true) // block align
  view.setUint16(34, 16, true) // bits por amostra
  writeString(36, "data")
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return new Blob([out], { type: "audio/wav" })
}
