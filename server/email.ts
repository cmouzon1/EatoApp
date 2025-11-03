import { Resend } from 'resend';
import type { Booking, Truck, Event, User } from '@shared/schema';

const resend = new Resend(process.env.RESEND_API_KEY);

interface BookingEmailData {
  booking: Booking;
  truck: Truck;
  event: Event;
  truckOwner: User;
  eventOrganizer: User;
}

export async function sendNewBookingNotification(data: BookingEmailData) {
  const { booking, truck, event, truckOwner, eventOrganizer } = data;

  try {
    // Send notification to truck owner
    await resend.emails.send({
      from: 'Eato <notifications@eato.app>',
      to: truckOwner.email!,
      subject: `New Booking Request for ${truck.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #ff6b35; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
              .button { display: inline-block; background-color: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
              .label { font-weight: bold; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Booking Request</h1>
              </div>
              <div class="content">
                <p>Hi ${truckOwner.firstName},</p>
                <p>You've received a new booking request for <strong>${truck.name}</strong>!</p>
                
                <div class="details">
                  <h3>Event Details</h3>
                  <p><span class="label">Event:</span> ${event.name}</p>
                  <p><span class="label">Date:</span> ${new Date(event.eventDate).toLocaleDateString()}</p>
                  <p><span class="label">Location:</span> ${event.location}</p>
                  <p><span class="label">Expected Attendees:</span> ${event.attendeeCount || 'Not specified'}</p>
                </div>
                
                <div class="details">
                  <h3>Organizer Information</h3>
                  <p><span class="label">Name:</span> ${eventOrganizer.firstName} ${eventOrganizer.lastName}</p>
                  <p><span class="label">Email:</span> ${eventOrganizer.email}</p>
                  ${eventOrganizer.phoneNumber ? `<p><span class="label">Phone:</span> ${eventOrganizer.phoneNumber}</p>` : ''}
                </div>
                
                ${booking.message ? `
                <div class="details">
                  <h3>Message from Organizer</h3>
                  <p>${booking.message}</p>
                </div>
                ` : ''}
                
                <p>Log in to your Eato dashboard to review and respond to this booking request.</p>
                
                <p>Best regards,<br>The Eato Team</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    // Send confirmation to event organizer
    await resend.emails.send({
      from: 'Eato <notifications@eato.app>',
      to: eventOrganizer.email!,
      subject: `Booking Request Sent to ${truck.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #ff6b35; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
              .status { display: inline-block; background-color: #ffd93d; color: #333; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Booking Request Sent</h1>
              </div>
              <div class="content">
                <p>Hi ${eventOrganizer.firstName},</p>
                <p>Your booking request has been successfully sent to <strong>${truck.name}</strong>.</p>
                
                <div class="details">
                  <p><span class="status">Pending Review</span></p>
                  <p>The truck owner will review your request and respond soon. We'll notify you once they accept or decline.</p>
                </div>
                
                <div class="details">
                  <h3>Your Event</h3>
                  <p><span style="font-weight: bold; color: #666;">Event:</span> ${event.name}</p>
                  <p><span style="font-weight: bold; color: #666;">Date:</span> ${new Date(event.eventDate).toLocaleDateString()}</p>
                  <p><span style="font-weight: bold; color: #666;">Location:</span> ${event.location}</p>
                </div>
                
                <p>You can track the status of your booking in your Eato dashboard.</p>
                
                <p>Best regards,<br>The Eato Team</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`New booking notification sent for booking #${booking.id}`);
  } catch (error) {
    console.error('Error sending new booking notification:', error);
    throw error;
  }
}

export async function sendBookingAcceptedNotification(data: BookingEmailData) {
  const { booking, truck, event, truckOwner, eventOrganizer } = data;

  try {
    await resend.emails.send({
      from: 'Eato <notifications@eato.app>',
      to: eventOrganizer.email!,
      subject: `${truck.name} Accepted Your Booking!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #6bcf7f; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
              .success-badge { display: inline-block; background-color: #6bcf7f; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
              .label { font-weight: bold; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Booking Accepted!</h1>
              </div>
              <div class="content">
                <p>Hi ${eventOrganizer.firstName},</p>
                <p>Great news! <strong>${truck.name}</strong> has accepted your booking request.</p>
                
                <div class="details">
                  <p><span class="success-badge">Confirmed</span></p>
                </div>
                
                <div class="details">
                  <h3>Event Details</h3>
                  <p><span class="label">Event:</span> ${event.name}</p>
                  <p><span class="label">Date:</span> ${new Date(event.eventDate).toLocaleDateString()}</p>
                  <p><span class="label">Time:</span> ${event.eventTime || 'TBD'}</p>
                  <p><span class="label">Location:</span> ${event.location}</p>
                </div>
                
                <div class="details">
                  <h3>Food Truck Information</h3>
                  <p><span class="label">Name:</span> ${truck.name}</p>
                  <p><span class="label">Cuisine:</span> ${truck.cuisine || 'Various'}</p>
                  ${truck.socialLinks ? `<p><span class="label">Contact:</span> Check their profile for details</p>` : ''}
                </div>
                
                <div class="details">
                  <h3>Next Steps</h3>
                  <ul>
                    <li>Coordinate final details with the truck owner</li>
                    <li>Confirm setup time and location specifics</li>
                    <li>Discuss menu options if needed</li>
                  </ul>
                </div>
                
                <p>Looking forward to making your event delicious!</p>
                
                <p>Best regards,<br>The Eato Team</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`Booking accepted notification sent for booking #${booking.id}`);
  } catch (error) {
    console.error('Error sending booking accepted notification:', error);
    throw error;
  }
}

export async function sendBookingDeclinedNotification(data: BookingEmailData) {
  const { booking, truck, event, truckOwner, eventOrganizer } = data;

  try {
    await resend.emails.send({
      from: 'Eato <notifications@eato.app>',
      to: eventOrganizer.email!,
      subject: `Booking Update: ${truck.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #6c757d; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
              .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 6px; }
              .button { display: inline-block; background-color: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Booking Status Update</h1>
              </div>
              <div class="content">
                <p>Hi ${eventOrganizer.firstName},</p>
                <p>Unfortunately, <strong>${truck.name}</strong> is unable to accept your booking request for the following event:</p>
                
                <div class="details">
                  <p><strong>Event:</strong> ${event.name}</p>
                  <p><strong>Date:</strong> ${new Date(event.eventDate).toLocaleDateString()}</p>
                  <p><strong>Location:</strong> ${event.location}</p>
                </div>
                
                <p>Don't worry! There are many other great food trucks on Eato that would love to cater your event.</p>
                
                <div class="details">
                  <h3>What's Next?</h3>
                  <ul>
                    <li>Browse other food trucks in your area</li>
                    <li>Filter by cuisine type and availability</li>
                    <li>Send booking requests to multiple trucks</li>
                  </ul>
                </div>
                
                <p>We're here to help you find the perfect food truck for your event!</p>
                
                <p>Best regards,<br>The Eato Team</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`Booking declined notification sent for booking #${booking.id}`);
  } catch (error) {
    console.error('Error sending booking declined notification:', error);
    throw error;
  }
}
