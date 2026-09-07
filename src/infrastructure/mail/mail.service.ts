import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export type TicketSeat = {
  rowLabel: string;
  seatNumber: number;
  seatType: string;
  qrBuffer: Buffer;
};

export type BookingConfirmationDetails = {
  to: string;
  bookingReference: string;
  movieTitle: string;
  cinemaName: string;
  screenName: string;
  showStartsAt: Date;
  seats: TicketSeat[];
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend = new Resend(process.env.RESEND_API_KEY);
  private readonly from = process.env.MAIL_FROM ?? 'Cinema Booking <onboarding@resend.dev>';

  async sendBookingConfirmation(details: BookingConfirmationDetails) {
    const {
      to,
      bookingReference,
      movieTitle,
      cinemaName,
      screenName,
      showStartsAt,
      seats,
    } = details;

    const formattedShowTime = showStartsAt.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const attachments = seats.map((seat, index) => ({
      filename: `${bookingReference}-seat-${seat.rowLabel}${seat.seatNumber}.png`,
      content: seat.qrBuffer,
      contentType: 'image/png',
      contentId: `seat-qr-${index}`,
    }));

    const ticketsHtml = seats
      .map(
        (seat, index) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#0b0b0d;border-radius:16px;overflow:hidden;border:1px solid #27272a;">
        <tr>
          <td style="padding:20px 20px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top;">
                  <div style="color:#71717a;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;">Seat</div>
                  <div style="color:#fafafa;font-size:28px;font-weight:700;line-height:1;">${seat.rowLabel}${seat.seatNumber}</div>
                  <div style="color:#a1a1aa;font-size:12px;margin-top:6px;text-transform:capitalize;">${seat.seatType.toLowerCase()}</div>
                </td>
                <td width="96" style="vertical-align:top;text-align:right;">
                  <img src="cid:seat-qr-${index}" width="88" height="88" alt="Seat ${seat.rowLabel}${seat.seatNumber} QR code" style="border-radius:8px;background:#fff;padding:4px;display:block;margin-left:auto;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px dashed #3f3f46;padding:12px 20px;color:#71717a;font-size:11px;">
            ${bookingReference} · Ticket ${index + 1} of ${seats.length}
          </td>
        </tr>
      </table>`,
      )
      .join('');

    const html = `
      <div style="background:#000;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
          <tr>
            <td style="text-align:center;padding-bottom:24px;">
              <div style="color:#f59e0b;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;">Booking confirmed</div>
              <h1 style="color:#fafafa;font-size:22px;margin:8px 0 0;">${movieTitle}</h1>
              <div style="color:#a1a1aa;font-size:14px;margin-top:6px;">
                ${formattedShowTime} · ${cinemaName} · ${screenName}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:8px;">
              <div style="color:#71717a;font-size:12px;text-align:center;margin-bottom:16px;">
                Reference <strong style="color:#e4e4e7;letter-spacing:.05em;">${bookingReference}</strong> ·
                ${seats.length} ${seats.length === 1 ? 'ticket' : 'tickets'} attached below
              </div>
              ${ticketsHtml}
            </td>
          </tr>
          <tr>
            <td style="text-align:center;padding-top:8px;">
              <p style="color:#71717a;font-size:12px;">Show a QR code at the entrance for each seat. Enjoy the movie!</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: `Your tickets for ${movieTitle} - ${bookingReference}`,
      html,
      attachments,
    });

    if (error) {
      this.logger.error(
        `Failed to send booking confirmation for ${bookingReference}: ${error.message}`,
      );
      throw new Error(error.message);
    }
  }
}
