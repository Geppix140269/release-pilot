// Run this script to add a free license for family members
// Usage: node add-family-license.js

const mongoose = require('mongoose');

// Connect to your MongoDB
mongoose.connect(process.env.MONGODB_URI || 'your-mongodb-url-here');

const License = mongoose.model('License', {
  key: String,
  email: String,
  plan: String,
  validUntil: Date,
  repositories: Number,
  status: String,
  createdAt: Date
});

// Generate unique license key
const generateFamilyLicense = async (email, name) => {
  const licenseKey = `RP-FAMILY-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  
  const newLicense = new License({
    key: licenseKey,
    email: email,
    plan: 'Professional',
    validUntil: new Date('2099-12-31'),
    repositories: 999,
    status: 'active',
    createdAt: new Date()
  });
  
  await newLicense.save();
  
  console.log(`✅ License created for ${name}!`);
  console.log(`License Key: ${licenseKey}`);
  console.log(`Email: ${email}`);
  console.log(`Plan: Professional (All Features)`);
  console.log(`Valid Until: Forever`);
  
  return licenseKey;
};

// Add your son's license
generateFamilyLicense('your-son@email.com', 'Your Son')
  .then(() => {
    console.log('\n🎉 License successfully created!');
    console.log('Your son can now use this license key in his GitHub Actions.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });