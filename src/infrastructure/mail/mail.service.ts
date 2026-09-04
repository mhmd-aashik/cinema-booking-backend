import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });

  async sendBookingConfirmation(
    to: string,
    bookingReference: string,
    qrBuffer: Buffer,
  ) {
    await this.transporter.sendMail({
      from: 'tickets@cinema.local',
      to,
      subject: `Booking confirmed - ${bookingReference}`,
      html: `
       <h2>Booking confirmed</h2>
       <p>Reference: <strong>${bookingReference}</strong></p>
       <p>Your QR ticket is attached.</p>
     `,
      attachments: [
        {
          filename: `${bookingReference}-ticket.png`,
          content: qrBuffer,
          contentType: 'image/png',
        },
      ],
    });
  }
}
