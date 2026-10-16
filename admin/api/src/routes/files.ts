import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { StoredFile } from '../../../shared';
import type { AppEnv } from '../env';
import { logActivity } from '../lib/data';
import { HttpError, newId, now } from '../lib/http';

/**
 * Files kept with an enquiry: drawings, site photos, a signed quote. The
 * bytes go to R2 under a random key; the type comes from the extension and
 * is checked against the file's first bytes where the format has a
 * signature. Downloads are always attachments, never shown in the panel's
 * own page.
 */
export const files = new Hono<AppEnv>();

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PER_ENQUIRY = 30;

const TYPES: Record<string, { mime: string; magic?: number[][] }> = {
  pdf: { mime: 'application/pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
  jpg: { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
  jpeg: { mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
  png: { mime: 'image/png', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  webp: { mime: 'image/webp', magic: [[0x52, 0x49, 0x46, 0x46]] },
  heic: { mime: 'image/heic' },
  dwg: { mime: 'image/vnd.dwg', magic: [[0x41, 0x43, 0x31, 0x30]] },
  dxf: { mime: 'image/vnd.dxf' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', magic: [[0x50, 0x4b, 0x03, 0x04]] },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', magic: [[0x50, 0x4b, 0x03, 0x04]] },
  csv: { mime: 'text/csv' },
  txt: { mime: 'text/plain' },
};
export const ALLOWED_EXTENSIONS = Object.keys(TYPES);

/** A name safe to show and to put in a header: no path, no control characters. */
const cleanName = (name: string) =>
  name
    .replace(/^.*[\\/]/, '')
    .replace(/[\x00-\x1f\x7f"<>|:*?]/g, '')
    .trim()
    .slice(0, 150) || 'file';

files.post('/enquiries/:id/files', bodyLimit({ maxSize: MAX_BYTES + 64 * 1024, onError: () => { throw new HttpError(413, 'A file can be at most 10 MB.'); } }), async (c) => {
  const enquiryId = c.req.param('id');
  const exists = await c.env.DB.prepare('SELECT (SELECT COUNT(*) FROM files WHERE enquiry_id = ?1) AS n FROM enquiries WHERE id = ?1').bind(enquiryId).first<{ n: number }>();
  if (!exists) throw new HttpError(404, 'That enquiry does not exist, or was deleted.');
  if (exists.n >= MAX_PER_ENQUIRY) throw new HttpError(400, `An enquiry can keep at most ${MAX_PER_ENQUIRY} files.`);

  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') throw new HttpError(400, 'Choose a file to upload.');
  if (file.size === 0) throw new HttpError(400, 'That file is empty.');
  if (file.size > MAX_BYTES) throw new HttpError(413, 'A file can be at most 10 MB.');

  const name = cleanName(file.name);
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const type = TYPES[ext];
  if (!type) throw new HttpError(415, `That kind of file is not accepted. Use ${ALLOWED_EXTENSIONS.join(', ')}.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (type.magic && !type.magic.some((m) => m.every((b, i) => bytes[i] === b))) {
    throw new HttpError(415, `That file is not a real .${ext} file.`);
  }

  const f: StoredFile = { id: newId(), name, type: type.mime, size: bytes.byteLength, createdAt: now() };
  const key = `enquiries/${enquiryId}/${f.id}`;
  await c.env.FILES.put(key, bytes, { httpMetadata: { contentType: type.mime }, customMetadata: { name } });
  try {
    await c.env.DB.prepare('INSERT INTO files (id, enquiry_id, r2_key, name, type, size, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
      .bind(f.id, enquiryId, key, f.name, f.type, f.size, f.createdAt)
      .run();
  } catch (e) {
    await c.env.FILES.delete(key);
    throw e;
  }
  await logActivity(c.env, 'File uploaded', name);
  return c.json(f, 201);
});

files.get('/files/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT r2_key, name, type FROM files WHERE id = ?1').bind(c.req.param('id')).first<{ r2_key: string; name: string; type: string }>();
  if (!row) throw new HttpError(404, 'That file does not exist, or was deleted.');
  const obj = await c.env.FILES.get(row.r2_key);
  if (!obj) throw new HttpError(404, 'That file is missing from storage.');
  const ascii = row.name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return new Response(obj.body, {
    headers: {
      'Content-Type': row.type,
      'Content-Length': String(obj.size),
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      'Cache-Control': 'private, no-store',
    },
  });
});

files.delete('/files/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT r2_key, name FROM files WHERE id = ?1').bind(c.req.param('id')).first<{ r2_key: string; name: string }>();
  if (!row) throw new HttpError(404, 'That file does not exist, or was deleted.');
  await c.env.FILES.delete(row.r2_key);
  await c.env.DB.prepare('DELETE FROM files WHERE id = ?1').bind(c.req.param('id')).run();
  await logActivity(c.env, 'File deleted', row.name);
  return c.json({ ok: true });
});
