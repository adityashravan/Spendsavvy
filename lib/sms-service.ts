// No imports needed - using built-in fetch

interface TwilioSMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

// Get Twilio configuration from environment
function getTwilioConfig(): TwilioSMSConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_KEY;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log('[TWILIO] Twilio credentials not fully configured. SMS messages will be logged only.');
    return null;
  }

  return { accountSid, authToken, fromNumber };
}

// Generate SMS message using Gemini AI based on alert type
async function generateSMSMessage(
  alertType: 'safety_alert' | 'spending_threshold',
  childName: string,
  alertData: any
): Promise<string> {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    let prompt = '';
    
    if (alertType === 'safety_alert') {
      prompt = `Generate a concise, urgent SMS alert message (max 160 chars) for a parent whose child "${childName}" has purchased unsafe items: ${alertData.unsafeItems?.join(', ')}. The message should be urgent but not panic-inducing. Include the child's name and ask them to contact the child immediately.`;
    } else {
      prompt = `Generate a concise SMS notification (max 160 chars) for a parent whose child "${childName}" has reached ${alertData.progressPercentage}% of their spending threshold (₹${alertData.currentSpending} of ₹${alertData.thresholdAmount}). Be informative but calm.`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedMessage = response.text().trim();

    // Ensure message is under SMS limit
    return generatedMessage.length > 160 
      ? generatedMessage.substring(0, 157) + '...'
      : generatedMessage;
      
  } catch (error) {
    console.error('[SMS AI] Error generating SMS message:', error);
    
    // Fallback messages
    if (alertType === 'safety_alert') {
      return `🚨 URGENT: ${childName} purchased unsafe items (${alertData.unsafeItems?.slice(0, 2).join(', ')}). Please contact them immediately. -spendsavvy`;
    } else {
      return `💸 Alert: ${childName} spent ${alertData.progressPercentage}% of budget (₹${alertData.currentSpending}/₹${alertData.thresholdAmount}). -spendsavvy`;
    }
  }
}

// Send SMS via Twilio API
export async function sendTwilioSMS(
  toPhone: string,
  alertType: 'safety_alert' | 'spending_threshold',
  childName: string,
  alertData: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log(`[TWILIO SMS] Sending ${alertType} to ${toPhone} for child: ${childName}`);
    
    const config = getTwilioConfig();
    
    if (!config) {
      // Generate and log the message even if not configured
      const message = await generateSMSMessage(alertType, childName, alertData);
      console.log(`[TWILIO FALLBACK] Would send SMS to ${toPhone}`);
      console.log(`[TWILIO FALLBACK] Message: ${message}`);
      return { success: true }; // Return success so notification logic continues
    }

    // Generate the SMS message using AI
    const message = await generateSMSMessage(alertType, childName, alertData);
    console.log(`[TWILIO SMS] Generated message: ${message}`);

    // Format phone number (ensure it has country code)
    let formattedPhone = toPhone.trim();
    
    // Remove any non-digit characters except +
    formattedPhone = formattedPhone.replace(/[^\d+]/g, '');
    
    // Handle Indian phone numbers
    if (formattedPhone.match(/^[6-9]\d{9}$/)) {
      // 10-digit Indian mobile number (starts with 6,7,8,9)
      formattedPhone = '+91' + formattedPhone;
    } else if (formattedPhone.match(/^91[6-9]\d{9}$/)) {
      // 12-digit number starting with 91
      formattedPhone = '+' + formattedPhone;
    } else if (formattedPhone.match(/^\+91[6-9]\d{9}$/)) {
      // Already properly formatted
      // Do nothing
    } else if (!formattedPhone.startsWith('+')) {
      // Add + if missing for international numbers
      formattedPhone = '+' + formattedPhone;
    }

    console.log(`[TWILIO SMS] Original phone: ${toPhone}`);
    console.log(`[TWILIO SMS] Formatted phone: ${formattedPhone}`);

    // Prepare form data for Twilio API
    const formData = new URLSearchParams();
    formData.append('To', formattedPhone);
    formData.append('From', config.fromNumber);
    formData.append('Body', message);

    // Create authorization header
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    // Send SMS via Twilio API
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const result = await response.json() as any;

    if (response.ok) {
      console.log(`[TWILIO SMS] SMS sent successfully! Message SID: ${result.sid}`);
      console.log(`[TWILIO SMS] Status: ${result.status}`);
      return { success: true, messageId: result.sid };
    } else {
      console.error(`[TWILIO SMS] Failed to send SMS:`, result);
      return { success: false, error: `${result.code}: ${result.message}` };
    }

  } catch (error) {
    console.error('[TWILIO SMS] Error sending SMS:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Test SMS configuration
export async function testTwilioConfiguration(): Promise<boolean> {
  const config = getTwilioConfig();
  
  if (!config) {
    console.log('[TWILIO TEST] Twilio not configured');
    return false;
  }

  try {
    // Test by making a simple request to Twilio API (without sending actual SMS)
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}.json`, {
      headers: {
        'Authorization': `Basic ${auth}`,
      }
    });

    if (response.ok) {
      console.log('[TWILIO TEST] Twilio configuration is valid');
      return true;
    } else {
      console.error('[TWILIO TEST] Twilio configuration test failed:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('[TWILIO TEST] Twilio configuration test failed:', error);
    return false;
  }
}

// Send test SMS
export async function sendTestSMS(
  toPhone: string,
  alertType: 'safety_alert' | 'spending_threshold' = 'safety_alert'
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const testData = alertType === 'safety_alert' 
    ? {
        unsafeItems: ['Beer', 'Cigarettes'],
        childEmail: 'testchild@example.com'
      }
    : {
        currentSpending: 4500,
        thresholdAmount: 5000,
        progressPercentage: 90
      };

  return await sendTwilioSMS(toPhone, alertType, 'Test Child', testData);
}
