const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generate random 6-digit verification code - FIXED
const generateVerificationCode = () => {
  // Generate a random number between 100000 and 999999
  const code = Math.floor(100000 + Math.random() * 900000);
  // Return as string to preserve leading zeros if any
  return code.toString();
};

// Send verification email
const sendVerificationEmail = async (email, code) => {
  const transporter = createTransporter();
  
  // Ensure code is a string
  const codeStr = String(code);
  
  const mailOptions = {
    from: `"T.M.F.K Waste Innovations" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email - T.M.F.K Waste Innovations',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #071B2E; color: #FFFFFF; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #00C9A7;">T.M.F.K</h1>
          <p style="color: #00C9A7;">Waste Innovations</p>
        </div>
        
        <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px;">
          <h2 style="color: #00C9A7; margin-bottom: 20px;">Email Verification</h2>
          <p style="margin-bottom: 20px;">Hello,</p>
          <p style="margin-bottom: 20px;">Thank you for registering with T.M.F.K Waste Innovations. Please use the verification code below to complete your registration:</p>
          
          <div style="background: #0A2540; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <h1 style="color: #00C9A7; font-size: 32px; letter-spacing: 5px; margin: 0;">${codeStr}</h1>
          </div>
          
          <p style="margin-bottom: 15px;">This code will expire in 10 minutes.</p>
          <p style="margin-bottom: 15px;">If you didn't request this, please ignore this email.</p>
          
          <hr style="border-color: rgba(255,255,255,0.1); margin: 25px 0;">
          
          <p style="font-size: 12px; color: #8BA5BC;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully with code:', codeStr);
    return info;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, code) => {
  const transporter = createTransporter();
  
  const codeStr = String(code);
  
  const mailOptions = {
    from: `"T.M.F.K Waste Innovations" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset - T.M.F.K Waste Innovations',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #071B2E; color: #FFFFFF; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #00C9A7;">T.M.F.K</h1>
          <p style="color: #00C9A7;">Waste Innovations</p>
        </div>
        
        <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px;">
          <h2 style="color: #00C9A7; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="margin-bottom: 20px;">Hello,</p>
          <p style="margin-bottom: 20px;">We received a request to reset the password for your account. Use the verification code below to reset your password:</p>
          
          <div style="background: #0A2540; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <h1 style="color: #00C9A7; font-size: 32px; letter-spacing: 5px; margin: 0;">${codeStr}</h1>
          </div>
          
          <p style="margin-bottom: 15px;">This code will expire in 10 minutes.</p>
          <p style="margin-bottom: 15px;">If you didn't request this, please ignore this email or contact support.</p>
          
          <hr style="border-color: rgba(255,255,255,0.1); margin: 25px 0;">
          
          <p style="font-size: 12px; color: #8BA5BC;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully with code:', codeStr);
    return info;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    throw error;
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
};