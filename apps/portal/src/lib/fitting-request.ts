// Bound upload memory before forwarding multipart data to the private API.
export async function fittingRequestBody(request: Request): Promise<ArrayBuffer> {
  const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data;');
  const limit = multipart ? 61 * 1024 * 1024 : 65536;
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing fitting details.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      throw new Error('Keep fitting attachments under 60 MB in total.');
    }
    chunks.push(value);
  }
  return Uint8Array.from(Buffer.concat(chunks)).buffer;
}
