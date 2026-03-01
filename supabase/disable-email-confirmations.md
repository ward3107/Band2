# How to Disable Email Confirmations in Supabase

Follow these steps to allow test email addresses to work:

## Steps:

1. Go to https://supabase.com/dashboard/project/pthhxqufzgbyzuucnfni/auth/settings

2. Scroll down to "Email Auth" section

3. Find "Enable email confirmations" toggle

4. **Turn OFF** "Enable email confirmations"

5. Click "Save" at the bottom

6. Wait a few seconds for settings to apply

7. Go back to http://localhost:3001/test-auth

8. Click "Test Create Account" again

## Alternative: Use Gmail-style emails

If you prefer to keep email confirmations enabled, you can use Gmail-style test emails:
- `testuser123@gmail.com`
- `teacher.test456@gmail.com`
- `vocab.test789@gmail.com`

These will pass validation but you won't receive the confirmation emails.
