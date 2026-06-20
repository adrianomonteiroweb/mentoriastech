/**
 * Blobs do MediaRecorder (WebM) não gravam duração nos metadados, então
 * <audio> reporta duration === Infinity e o player nativo mostra 0:00 / 0:00
 * e não permite tocar/seek. Forçar um seek para um tempo enorme faz o
 * navegador ler até o fim e calcular a duração real; depois voltamos ao início.
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
