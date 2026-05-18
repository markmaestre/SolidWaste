// test-email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('🔐 Testing email configuration...');
  console.log('Email user:', process.env.EMAIL_USER);
  console.log('Email pass exists:', process.env.EMAIL_PASS ? 'Yes' : 'No');
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify connection
    console.log('📡 Verifying connection to Gmail...');
    await transporter.verify();
    console.log('✅ Connection verified!');

    // Try sending a test email
    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: `"T.M.F.K Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'Test Email - T.M.F.K System',
      text: 'This is a test email to verify SMTP settings are working.',
      html: '<h1>Test Successful!</h1><p>Your email configuration is working correctly.</p>',
    });

    console.log('✅ Test email sent successfully!');
    console.log('📨 Message ID:', info.messageId);
    console.log('📬 Check your inbox (and spam folder)');
    
  } catch (error) {
    console.error('❌ Email error:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    
    if (error.message.includes('Invalid login')) {
      console.error('   → Your App Password is incorrect');
      console.error('   → Generate a new one at: https://myaccount.google.com/apppasswords');
    }
    
    if (error.message.includes('535')) {
      console.error('   → Authentication failed');
      console.error('   → Make sure 2FA is enabled and you are using an App Password');
    }
    
    if (error.message.includes('334')) {
      console.error('   → Authentication method issue');
      console.error('   → Try enabling "Allow less secure apps" temporarily');
    }
    
    console.error('\n📝 Full error details:', error);
  }
}

// Run the test
testEmail();