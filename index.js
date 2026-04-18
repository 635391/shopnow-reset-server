const express = require('express');
const admin = require('firebase-admin');
const app = express();
app.use(express.json());

// Firebase initialize — Render environment variable thi
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ShopNow Reset Server is running ✅' });
});

// Password Reset Endpoint
app.post('/resetPassword', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email and password required.'
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters.'
    });
  }

  try {
    // OTP verified check karo
    const resetDoc = await db.collection('password_resets').doc(email).get();

    if (!resetDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Session expired. Please restart forgot password.'
      });
    }

    if (!resetDoc.data().verified) {
      return res.status(403).json({
        success: false,
        message: 'OTP not verified. Please verify OTP first.'
      });
    }

    // Firebase Auth ma user shodo
    const userRecord = await admin.auth().getUserByEmail(email);

    // Password update karo
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });

    // OTP record delete karo
    await db.collection('password_resets').doc(email).delete();

    console.log('Password reset successful for:', email);
    return res.json({ success: true, message: 'Password updated successfully.' });

  } catch (error) {
    console.error('Reset error:', error.message);

    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ShopNow Reset Server running on port ${PORT}`);
});