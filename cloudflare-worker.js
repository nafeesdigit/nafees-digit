// WASA Kasur photo API - Cloudflare Worker + R2
// Required Worker R2 binding: BUCKET -> your R2 bucket (WASA Store)
// Routes: POST /upload?name=<safe-name> (JPEG, max 5 MB)
//         GET  /photos/<filename>.jpg
const MAX_BYTES = 5 * 1024 * 1024;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (request.method === 'POST' && url.pathname === '/upload') {
      const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
      if (type !== 'image/jpeg') return json({ error: 'Sirf JPEG photo allowed hai' }, 400);
      const data = await request.arrayBuffer();
      if (!data.byteLength || data.byteLength > MAX_BYTES) return json({ error: 'Photo ka size 1 byte se 5 MB tak hona chahiye' }, 413);
      // Basic JPEG signature check; browser-side conversion is still required.
      const bytes = new Uint8Array(data);
      if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return json({ error: 'Invalid JPEG file' }, 400);
      const name = (url.searchParams.get('name') || 'photo').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'photo';
      const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
      const key = `photos/${name}_${Date.now()}_${rand}.jpg`;
      await env.BUCKET.put(key, data, { httpMetadata: { contentType: 'image/jpeg', contentDisposition: `inline; filename="${name}.jpg"` } });
      return json({ url: `${url.origin}/${key}`, key });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/photos/')) {
      const key = url.pathname.slice(1);
      if (!/^photos\/[A-Za-z0-9_-]+_[0-9]+_[A-Za-z0-9]+\.jpg$/.test(key)) return new Response('Not found', { status: 404, headers: CORS });
      const obj = await env.BUCKET.get(key);
      if (!obj) return new Response('Not found', { status: 404, headers: CORS });
      const headers = new Headers(CORS);
      obj.writeHttpMetadata(headers);
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(obj.body, { headers });
    }
    return new Response('WASA photo service chal raha hai', { headers: CORS });
  },
};
