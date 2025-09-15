import { test, expect } from '@playwright/test';

test.describe('Participant Signup', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the signup page
    await page.goto('http://localhost:3002/auth/signup');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display signup form with correct fields', async ({ page }) => {
    // Check that all required fields are present
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="dateOfBirth"]')).toBeVisible();
    await expect(page.locator('input[value="male"]')).toBeVisible();
    await expect(page.locator('input[value="female"]')).toBeVisible();

    // Check that "other" gender option is NOT present
    await expect(page.locator('input[value="other"]')).not.toBeVisible();

    // Check optional fields
    await expect(page.locator('input[name="jobTitle"]')).toBeVisible();
    await expect(page.locator('input[name="organization"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();

    // Check consent checkboxes
    await expect(page.locator('input[name="consentWellness"]')).toBeVisible();
    await expect(page.locator('input[name="consentLiability"]')).toBeVisible();
    await expect(page.locator('input[name="consentData"]')).toBeVisible();

    // Check that digital signature field is NOT present
    await expect(page.locator('input[name="signature"]')).not.toBeVisible();

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Complete Registration');
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit form without filling required fields
    await page.click('button[type="submit"]');

    // Check for validation errors
    await expect(page.locator('text=Full name is required')).toBeVisible();
    await expect(page.locator('text=Date of birth is required')).toBeVisible();
    await expect(page.locator('text=Please select your gender')).toBeVisible();
    await expect(page.locator('text=You must agree to the wellness screening consent')).toBeVisible();
    await expect(page.locator('text=You must agree to the liability waiver')).toBeVisible();
    await expect(page.locator('text=You must agree to the data collection and use consent')).toBeVisible();
  });

  test('should validate date of birth age constraints', async ({ page }) => {
    // Fill in full name first
    await page.fill('input[name="fullName"]', 'Test User');

    // Test date that makes user too young (under 10)
    const tooYoungDate = new Date();
    tooYoungDate.setFullYear(tooYoungDate.getFullYear() - 5);
    await page.fill('input[name="dateOfBirth"]', tooYoungDate.toISOString().split('T')[0]);

    // Select gender
    await page.click('input[value="male"]');

    // Check consent boxes
    await page.check('input[name="consentWellness"]');
    await page.check('input[name="consentLiability"]');
    await page.check('input[name="consentData"]');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show age validation error
    await expect(page.locator('text=Age must be between 10 and 95 years')).toBeVisible();

    // Test date that makes user too old (over 95)
    const tooOldDate = new Date();
    tooOldDate.setFullYear(tooOldDate.getFullYear() - 96);
    await page.fill('input[name="dateOfBirth"]', tooOldDate.toISOString().split('T')[0]);

    await page.click('button[type="submit"]');
    await expect(page.locator('text=Age must be between 10 and 95 years')).toBeVisible();
  });

  test('should successfully complete registration with valid data', async ({ page }) => {
    // Fill in required fields
    await page.fill('input[name="fullName"]', 'John Smith');

    // Set date of birth for a 25-year-old
    const validDate = new Date();
    validDate.setFullYear(validDate.getFullYear() - 25);
    await page.fill('input[name="dateOfBirth"]', validDate.toISOString().split('T')[0]);

    // Select gender
    await page.click('input[value="male"]');

    // Fill optional fields
    await page.fill('input[name="jobTitle"]', 'Software Developer');
    await page.fill('input[name="organization"]', 'Tech Corp');
    await page.fill('input[name="email"]', 'john.smith@example.com');
    await page.fill('input[name="phone"]', '555-123-4567');

    // Check all consent boxes
    await page.check('input[name="consentWellness"]');
    await page.check('input[name="consentLiability"]');
    await page.check('input[name="consentData"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=Registration Successful!')).toBeVisible();
    await expect(page.locator('text=Please check your email and verify your account to access your QR code')).toBeVisible();

    // Should have continue button
    await expect(page.locator('button:has-text("Continue to Participation")')).toBeVisible();
  });

  test('should navigate to participation page after successful registration', async ({ page }) => {
    // Complete registration
    await page.fill('input[name="fullName"]', 'Jane Doe');

    const validDate = new Date();
    validDate.setFullYear(validDate.getFullYear() - 30);
    await page.fill('input[name="dateOfBirth"]', validDate.toISOString().split('T')[0]);

    await page.click('input[value="female"]');
    await page.check('input[name="consentWellness"]');
    await page.check('input[name="consentLiability"]');
    await page.check('input[name="consentData"]');

    await page.click('button[type="submit"]');

    // Wait for success screen
    await expect(page.locator('text=Registration Successful!')).toBeVisible();

    // Click continue button
    await page.click('button:has-text("Continue to Participation")');

    // Should navigate to participation page
    await expect(page).toHaveURL(/.*\/participate/);
  });

  test('should handle form submission loading state', async ({ page }) => {
    // Fill in required fields
    await page.fill('input[name="fullName"]', 'Test User');

    const validDate = new Date();
    validDate.setFullYear(validDate.getFullYear() - 25);
    await page.fill('input[name="dateOfBirth"]', validDate.toISOString().split('T')[0]);

    await page.click('input[value="male"]');
    await page.check('input[name="consentWellness"]');
    await page.check('input[name="consentLiability"]');
    await page.check('input[name="consentData"]');

    // Submit form and immediately check loading state
    await page.click('button[type="submit"]');

    // Button should show loading state (briefly)
    await expect(page.locator('button[type="submit"]:has-text("Registering Participant")')).toBeVisible();

    // Then should show success
    await expect(page.locator('text=Registration Successful!')).toBeVisible();
  });

  test('should preserve form data during validation errors', async ({ page }) => {
    // Fill in some fields but not all required ones
    await page.fill('input[name="fullName"]', 'Partial User');
    await page.fill('input[name="jobTitle"]', 'Tester');
    await page.click('input[value="female"]');

    // Submit form (should fail validation)
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=Date of birth is required')).toBeVisible();

    // But should preserve filled data
    await expect(page.locator('input[name="fullName"]')).toHaveValue('Partial User');
    await expect(page.locator('input[name="jobTitle"]')).toHaveValue('Tester');
    await expect(page.locator('input[value="female"]')).toBeChecked();
  });

  test('should show proper field labels and placeholders', async ({ page }) => {
    // Check field labels
    await expect(page.locator('text=Full Name *')).toBeVisible();
    await expect(page.locator('text=Date of Birth *')).toBeVisible();
    await expect(page.locator('text=Gender *')).toBeVisible();
    await expect(page.locator('text=Job Title')).toBeVisible();
    await expect(page.locator('text=Organization')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator('text=Phone Number')).toBeVisible();

    // Check placeholders
    await expect(page.locator('input[name="fullName"]')).toHaveAttribute('placeholder', 'Enter your full name');
    await expect(page.locator('input[name="jobTitle"]')).toHaveAttribute('placeholder', 'Enter your job title (optional)');
    await expect(page.locator('input[name="organization"]')).toHaveAttribute('placeholder', 'Enter your organization (optional)');
    await expect(page.locator('input[name="email"]')).toHaveAttribute('placeholder', 'your@email.com (optional)');
    await expect(page.locator('input[name="phone"]')).toHaveAttribute('placeholder', '(555) 123-4567 (optional)');

    // Check consent labels
    await expect(page.locator('text=Wellness Screening Consent *')).toBeVisible();
    await expect(page.locator('text=Liability Waiver *')).toBeVisible();
    await expect(page.locator('text=Data Collection & Use Consent *')).toBeVisible();
  });
});