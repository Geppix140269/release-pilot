// Add this to your src/index.ts or license validation

const FAMILY_GITHUB_USERNAMES = [
  'your-sons-github-username',
  'other-family-member',
  // Add family GitHub usernames here
];

const FAMILY_EMAILS = [
  'son@email.com',
  'family@email.com',
  // Add family emails here
];

export function validateLicense(username: string, email: string, licenseKey: string): boolean {
  // Always allow family members
  if (FAMILY_GITHUB_USERNAMES.includes(username)) {
    console.log('✅ Family member detected - free access granted!');
    return true;
  }
  
  if (FAMILY_EMAILS.includes(email)) {
    console.log('✅ Family email detected - free access granted!');
    return true;
  }
  
  // Special family license key
  if (licenseKey === 'RP-FAMILY-FREE') {
    console.log('✅ Family license key - access granted!');
    return true;
  }
  
  // Regular license validation continues here...
  return normalLicenseValidation(licenseKey);
}