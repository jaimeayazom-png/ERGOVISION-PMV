// Servicio para subir imágenes a Supabase Storage
import { randomUUID } from 'crypto';
import { getSupabase } from './supabase';

const NOMBRE_BUCKET = 'product-images';
let bucketInicializado = false;

// Asegura que el bucket existe (lo crea público si no)
async function asegurarBucket() {
  if (bucketInicializado) return;
  const sb = getSupabase();
  try {
    const { data: buckets } = await sb.storage.listBuckets();
    if (!buckets?.find((b) => b.name === NOMBRE_BUCKET)) {
      await sb.storage.createBucket(NOMBRE_BUCKET, { public: true });
    }
    bucketInicializado = true;
  } catch (err) {
    console.error('Error inicializando bucket:', err);
  }
}

// Sube una imagen desde data URL base64 y devuelve la URL pública
export async function subirImagenDesdeDataUrl(dataUrl) {
  await asegurarBucket();
  const sb = getSupabase();
  // Formato esperado: "data:image/png;base64,XXXX"
  const match = (dataUrl || '').match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error('Formato base64 inválido');
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const nombreArchivo = `${randomUUID()}_${Date.now()}.${extension}`;
  const { error } = await sb.storage
    .from(NOMBRE_BUCKET)
    .upload(nombreArchivo, buffer, {
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      upsert: false,
    });
  if (error) throw new Error('Error subiendo imagen: ' + error.message);
  const { data } = sb.storage.from(NOMBRE_BUCKET).getPublicUrl(nombreArchivo);
  return data.publicUrl;
}
