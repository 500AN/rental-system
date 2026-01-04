const nodemailer = require('nodemailer');
const twilio = require('twilio');

console.log('Initializing notification service...');
console.log('Email configured:', !!process.env.EMAIL_USER);
console.log('Twilio configured:', !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN));

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

async function sendBookingEmail(customerEmail, bookingDetails, type = 'booking') {
  if (!process.env.EMAIL_USER || !customerEmail) {
    console.log('Email not configured or customer email not provided');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('Customer Email:', customerEmail);
    return;
  }

  console.log('Attempting to send email to:', customerEmail);

  const { booking_number, customer_name, rental_start_date, rental_end_date, items, total_amount, advance_amount, final_amount, remaining_balance, items_action } = bookingDetails;

  const itemsList = items.map(item =>
    `- ${item.product_name} x ${item.quantity} @ ₹${item.agreed_rental_price || item.agreed_price}/day = ₹${item.item_total_amount || item.total_amount}`
  ).join('\n');

  let subject, htmlContent;

  if (type === 'return') {
    const returnedItems = items.filter((item, idx) => items_action[idx]?.action === 'return');
    const washingItems = items.filter((item, idx) => items_action[idx]?.action === 'washing');
    const damagedItems = items.filter((item, idx) => items_action[idx]?.action === 'damaged');

    subject = `Return Confirmed - ${booking_number}`;
    htmlContent = `
      <h2>Return Confirmation</h2>
      <p>Dear ${customer_name},</p>
      <p>Thank you for returning the rental items. Here's a summary:</p>

      <h3>Booking Details:</h3>
      <p><strong>Booking Number:</strong> ${booking_number}</p>
      <p><strong>Rental Period:</strong> ${new Date(rental_start_date).toLocaleDateString()} to ${new Date(rental_end_date).toLocaleDateString()}</p>

      ${returnedItems.length > 0 ? `<h3>Items Returned:</h3><pre>${returnedItems.map(i => `- ${i.product_name} x ${i.quantity}`).join('\n')}</pre>` : ''}
      ${washingItems.length > 0 ? `<h3>Items Sent for Washing:</h3><pre>${washingItems.map(i => `- ${i.product_name} x ${i.quantity}`).join('\n')}</pre>` : ''}
      ${damagedItems.length > 0 ? `<h3>Damaged Items:</h3><pre>${damagedItems.map(i => `- ${i.product_name} x ${i.quantity}`).join('\n')}</pre>` : ''}

      <p>Thank you for choosing our service! We hope to serve you again.</p>
      <p>For any queries, please contact us.</p>
    `;
  } else if (type === 'pickup') {
    subject = `Pickup Confirmed - ${booking_number}`;
    htmlContent = `
      <h2>Pickup Confirmation</h2>
      <p>Dear ${customer_name},</p>
      <p>Your rental items have been picked up successfully. Here are the details:</p>

      <h3>Booking Details:</h3>
      <p><strong>Booking Number:</strong> ${booking_number}</p>
      <p><strong>Rental Period:</strong> ${new Date(rental_start_date).toLocaleDateString()} to ${new Date(rental_end_date).toLocaleDateString()}</p>

      <h3>Items Picked Up:</h3>
      <pre>${itemsList}</pre>

      <h3>Payment Summary:</h3>
      <p><strong>Total Amount:</strong> ₹${total_amount}</p>
      <p><strong>Advance Paid:</strong> ₹${advance_amount}</p>
      <p><strong>Final Payment:</strong> ₹${final_amount}</p>
      <p><strong>Remaining Balance:</strong> ₹${remaining_balance}</p>

      <p><strong>Please return the items by ${new Date(rental_end_date).toLocaleDateString()}</strong></p>
      <p>Thank you for choosing our service!</p>
      <p>For any queries, please contact us.</p>
    `;
  } else {
    subject = `Booking Confirmation - ${booking_number}`;
    htmlContent = `
      <h2>Booking Confirmation</h2>
      <p>Dear ${customer_name},</p>
      <p>Your booking has been confirmed. Here are the details:</p>

      <h3>Booking Details:</h3>
      <p><strong>Booking Number:</strong> ${booking_number}</p>
      <p><strong>Rental Period:</strong> ${new Date(rental_start_date).toLocaleDateString()} to ${new Date(rental_end_date).toLocaleDateString()}</p>

      <h3>Items:</h3>
      <pre>${itemsList}</pre>

      <h3>Payment Details:</h3>
      <p><strong>Total Amount:</strong> ₹${total_amount}</p>
      <p><strong>Advance Paid:</strong> ₹${advance_amount}</p>
      <p><strong>Balance Due:</strong> ₹${(total_amount - advance_amount).toFixed(2)}</p>

      <p>Thank you for choosing our service!</p>
      <p>For any queries, please contact us.</p>
    `;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: subject,
    html: htmlContent
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', customerEmail);
    console.log('Message ID:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

async function sendBookingWhatsApp(phoneNumber, bookingDetails, type = 'booking') {
  if (!twilioClient || !process.env.TWILIO_WHATSAPP_NUMBER) {
    console.log('WhatsApp not configured');
    console.log('Twilio Client:', !!twilioClient);
    console.log('WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER);
    return;
  }

  console.log('Attempting to send WhatsApp to:', phoneNumber);

  const { booking_number, customer_name, rental_start_date, rental_end_date, items, total_amount, advance_amount, final_amount, remaining_balance, items_action } = bookingDetails;

  const itemsList = items.map(item =>
    `${item.product_name} x ${item.quantity} @ ₹${item.agreed_rental_price || item.agreed_price}/day = ₹${item.item_total_amount || item.total_amount}`
  ).join('\n');

  let message;

  if (type === 'return') {
    const returnedItems = items.filter((item, idx) => items_action[idx]?.action === 'return');
    const washingItems = items.filter((item, idx) => items_action[idx]?.action === 'washing');
    const damagedItems = items.filter((item, idx) => items_action[idx]?.action === 'damaged');

    message = `
*Return Confirmation*

Dear ${customer_name},

Thank you for returning the rental items!

*Booking Number:* ${booking_number}
*Rental Period:* ${new Date(rental_start_date).toLocaleDateString()} to ${new Date(rental_end_date).toLocaleDateString()}

${returnedItems.length > 0 ? `*Items Returned:*\n${returnedItems.map(i => `${i.product_name} x ${i.quantity}`).join('\n')}\n` : ''}
${washingItems.length > 0 ? `*Items Sent for Washing:*\n${washingItems.map(i => `${i.product_name} x ${i.quantity}`).join('\n')}\n` : ''}
${damagedItems.length > 0 ? `*Damaged Items:*\n${damagedItems.map(i => `${i.product_name} x ${i.quantity}`).join('\n')}\n` : ''}

Thank you for choosing our service! We hope to serve you again.
    `.trim();
  } else if (type === 'pickup') {
    message = `
*Pickup Confirmation*

Dear ${customer_name},

Your rental items have been picked up successfully!

*Booking Number:* ${booking_number}
*Rental Period:* ${new Date(rental_start_date).toLocaleDateString()} to ${new Date(rental_end_date).toLocaleDateString()}

*Items Picked Up:*
${itemsList}

*Payment Summary:*
Total Amount: ₹${total_amount}
Advance Paid: ₹${advance_amount}
Final Payment: ₹${final_amount}
Remaining Balance: ₹${remaining_balance}

*Please return the items by ${new Date(rental_end_date).toLocaleDateString()}*

Thank you for choosing our service!
    `.trim();
  } else {
    message = `
*Booking Confirmation*

Dear ${customer_name},

Your booking has been confirmed!

*Booking Number:* ${booking_number}
*Rental Period:* ${new Date(rental_start_date).toLocaleDateString()} to ${new Date(rental_end_date).toLocaleDateString()}

*Items:*
${itemsList}

*Payment Details:*
Total Amount: ₹${total_amount}
Advance Paid: ₹${advance_amount}
Balance Due: ₹${(total_amount - advance_amount).toFixed(2)}

Thank you for choosing our service!
    `.trim();
  }

  try {
    // Clean and format phone number
    let cleanPhone = phoneNumber.toString().replace(/\D/g, ''); // Remove non-digits

    // Add country code if not present
    if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const formattedPhone = '+' + cleanPhone;
    console.log('Original phone:', phoneNumber);
    console.log('Formatted phone:', formattedPhone);
    console.log('From WhatsApp number:', process.env.TWILIO_WHATSAPP_NUMBER);

    const result = await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${formattedPhone}`
    });
    console.log('WhatsApp message sent successfully!');
    console.log('Message SID:', result.sid);
    console.log('Status:', result.status);
    return result;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);

    if (error.code === 21211) {
      console.error('⚠️  Invalid phone number format. Phone:', phoneNumber);
    } else if (error.code === 63007) {
      console.error('⚠️  Recipient not in Twilio sandbox. They need to send "join <sandbox-code>" to your Twilio WhatsApp number first.');
    } else if (error.code === 21606) {
      console.error('⚠️  The "From" phone number is not a valid WhatsApp-enabled number.');
    }

    console.error('Full error details:', JSON.stringify(error, null, 2));
    throw error;
  }
}

async function sendBookingNotifications(customerData, bookingDetails, type = 'booking') {
  console.log('=== Sending Booking Notifications ===');
  console.log('Notification Type:', type);
  console.log('Customer Data:', customerData);
  console.log('Booking Number:', bookingDetails.booking_number);

  const promises = [];

  if (customerData.email) {
    console.log('Queueing email notification...');
    promises.push(sendBookingEmail(customerData.email, bookingDetails, type));
  } else {
    console.log('No email address provided for customer');
  }

  if (customerData.phone_number) {
    console.log('Queueing WhatsApp notification...');
    promises.push(sendBookingWhatsApp(customerData.phone_number, bookingDetails, type));
  } else {
    console.log('No phone number provided for customer');
  }

  const results = await Promise.allSettled(promises);

  results.forEach((result, index) => {
    const type = index === 0 && customerData.email ? 'Email' : 'WhatsApp';
    if (result.status === 'fulfilled') {
      console.log(`✅ ${type} notification sent successfully`);
    } else {
      console.log(`❌ ${type} notification failed:`, result.reason?.message);
    }
  });

  console.log('=== Notifications Complete ===');
}

module.exports = {
  sendBookingNotifications,
  sendBookingEmail,
  sendBookingWhatsApp
};
