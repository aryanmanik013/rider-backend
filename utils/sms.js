// utils/sms.js
import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send OTP via SMS
export const sendOTPSMS = async (phoneNumber, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your Rider App OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`,
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
      to: `+91${phoneNumber}` // Assuming Indian numbers, adjust as needed
    });

    console.log(`SMS sent successfully. SID: ${message.sid}`);
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('SMS sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Alternative: Send OTP via WhatsApp (if you have WhatsApp Business API)
export const sendOTPWhatsApp = async (phoneNumber, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your Rider App OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:+91${phoneNumber}`
    });

    console.log(`WhatsApp message sent successfully. SID: ${message.sid}`);
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('WhatsApp message sending failed:', error);
    return { success: false, error: error.message };
  }
};
