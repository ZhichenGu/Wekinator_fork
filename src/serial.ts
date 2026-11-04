export type LineEnding = 'none' | 'lf' | 'crlf';
export type SerialMessage = { text: string; lineEnding: LineEnding };
export const DEFAULT_MESSAGE: SerialMessage = { text: '/success', lineEnding: 'lf' };
export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400];
export interface DevicePort extends EventTarget {
  writable: WritableStream<Uint8Array> | null;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}
export interface SerialAPI extends EventTarget {
  getPorts(): Promise<DevicePort[]>;
  requestPort(): Promise<DevicePort>;
}
export function encodeMessage(message: SerialMessage): Uint8Array {
  if (typeof message.text !== 'string' || !message.text.length || message.text.length > 512) throw new Error('发送内容需为 1–512 个字符。');
  if (!['none','lf','crlf'].includes(message.lineEnding)) throw new Error('不支持的结束符。');
  const ending = message.lineEnding === 'lf' ? '\n' : message.lineEnding === 'crlf' ? '\r\n' : '';
  return new TextEncoder().encode(message.text + ending);
}
export function portLabel(port: DevicePort, index: number): string {
  const info = port.getInfo();
  const hex = (n: number) => n.toString(16).padStart(4,'0').toUpperCase();
  return `串口 ${index + 1}` + (info.usbVendorId !== undefined ? ` · USB ${hex(info.usbVendorId)}:${hex(info.usbProductId ?? 0)}` : '');
}
/** One explicit connection; no automatic retries or deferred message queue. */
export class SerialConnection {
  port: DevicePort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private sending: Promise<void> | null = null;
  private opening = false;
  private generation = 0;
  async connect(port: DevicePort, baudRate: number): Promise<void> {
    if (this.port || this.opening) throw new Error('请先断开当前串口。');
    if (!BAUD_RATES.includes(baudRate)) throw new Error('不支持的波特率。');
    this.opening = true;const gen=++this.generation;
    try { await port.open({baudRate});if(gen!==this.generation){await port.close();throw new Error('连接已取消。');}this.port = port; }
    finally { this.opening = false; }
  }
  send(message: SerialMessage): Promise<void> {
    const bytes = encodeMessage(message);
    if (!this.port?.writable) return Promise.reject(new Error('串口未连接，没有发送数据。'));
    if (this.sending) return Promise.reject(new Error('上一条数据仍在发送，本次未发送。'));
    const writer = this.port.writable.getWriter(); this.writer = writer;
    this.sending = (async()=>{
      try { await writer.write(bytes); }
      finally { writer.releaseLock(); this.writer=null; this.sending=null; }
    })();
    return this.sending;
  }
  async disconnect(): Promise<void> {
    this.generation++;const port=this.port; this.port=null;
    if (!port) return;
    if (this.writer) {
      await this.writer.abort('连接已关闭').catch(()=>{});
      await this.sending?.catch(()=>{});
    }
    await port.close();
  }
}
