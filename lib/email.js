// Servicio de envío de emails con Resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const REMITENTE = process.env.EMAIL_FROM || 'ErgoVision <onboarding@resend.dev>';

// Formatea un número como moneda colombiana
const formatoCOP = (n) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

// Construye el HTML del email de confirmación de pedido
function construirHtmlPedido(pedido, configSitio = {}) {
  const colorPrimario = configSitio.primary_color || '#00CC99';
  const nombreSitio = configSitio.site_name || 'ErgoVision';
  const itemsHtml = (pedido.items || [])
    .map(
      (it) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;">${it.product_name}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">${formatoCOP(it.price)}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${formatoCOP(Number(it.price) * it.quantity)}</td>
        </tr>`
    )
    .join('');

  return `
  <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:30px 0;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg, ${colorPrimario}, #0ea5e9);padding:30px;text-align:center;color:#fff;">
        <h1 style="margin:0;font-size:28px;">✓ ¡Pago confirmado!</h1>
        <p style="margin:6px 0 0;opacity:0.95;">Gracias por tu compra en ${nombreSitio}</p>
      </div>
      <div style="padding:30px;color:#1e293b;">
        <p style="font-size:16px;">Hola <strong>${pedido.customer_name}</strong>,</p>
        <p>Tu pedido <strong>#${(pedido.order_id || '').slice(0, 8)}</strong> ha sido procesado correctamente. A continuación el detalle:</p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#fff;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:10px;text-align:left;font-size:13px;color:#475569;">Producto</th>
              <th style="padding:10px;text-align:center;font-size:13px;color:#475569;">Cant.</th>
              <th style="padding:10px;text-align:right;font-size:13px;color:#475569;">Precio</th>
              <th style="padding:10px;text-align:right;font-size:13px;color:#475569;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:15px 10px;text-align:right;font-size:18px;font-weight:700;">Total:</td>
              <td style="padding:15px 10px;text-align:right;font-size:18px;font-weight:700;color:${colorPrimario};">${formatoCOP(pedido.total)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background:#f1f5f9;padding:15px;border-radius:8px;margin-top:20px;">
          <p style="margin:0;font-size:14px;color:#475569;"><strong>Estado:</strong> ${pedido.status || 'completed'}</p>
          <p style="margin:6px 0 0;font-size:14px;color:#475569;"><strong>Email:</strong> ${pedido.customer_email}</p>
        </div>

        <p style="margin-top:25px;font-size:14px;color:#64748b;">Pronto recibirás información sobre el envío. Si tienes dudas, contacta a nuestro equipo de soporte.</p>
      </div>
      <div style="background:#0f172a;color:#94a3b8;padding:20px;text-align:center;font-size:12px;">
        © ${new Date().getFullYear()} ${nombreSitio} · Lentes con filtro de luz azul
      </div>
    </div>
  </div>`;
}

// Función principal: envía email de confirmación de pedido
export async function enviarEmailConfirmacionPedido(destinatario, pedido, configSitio) {
  try {
    const html = construirHtmlPedido(pedido, configSitio);
    const { data, error } = await resend.emails.send({
      from: REMITENTE,
      to: [destinatario],
      subject: `✓ Confirmación de tu pedido #${(pedido.order_id || '').slice(0, 8)} - ErgoVision`,
      html,
    });
    if (error) {
      console.error('Resend error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error('Excepción al enviar email:', err);
    return { ok: false, error: err.message };
  }
}
