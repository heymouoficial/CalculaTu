// public/pcm-processor.js
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // Buffer intermedio
    this.buffer = new Float32Array(this.bufferSize);
    this.byteCount = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // Mono channel

      // Conversión simple Float32 -> Int16 PCM
      // Nota: Para producción idealmente usaríamos un downsampler más sofisticado,
      // pero para el MVP esto funciona si el AudioContext se inicializa a 16kHz o cerca.
      const int16Data = new Int16Array(channelData.length);

      for (let i = 0; i < channelData.length; i++) {
        // Clamp entre -1 y 1 y convertir a 16-bit
        const s = Math.max(-1, Math.min(1, channelData[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Enviar al hilo principal
      this.port.postMessage(int16Data.buffer, [int16Data.buffer]);
    }
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);