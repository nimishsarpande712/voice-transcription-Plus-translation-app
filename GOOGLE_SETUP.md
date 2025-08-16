# Google Cloud Speech-to-Text API Setup Guide

## Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Note your Project ID

## Step 2: Enable the Speech-to-Text API
1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Cloud Speech-to-Text API"
3. Click on it and press **ENABLE**

## Step 3: Create Service Account Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the service account details:
   - Name: `speech-transcriber`
   - Description: `Service account for audio transcription`
4. Click **Create and Continue**
5. Grant the role: **Cloud Speech Client** or **Editor**
6. Click **Done**

## Step 4: Download the Service Account Key
1. In the **Credentials** page, find your service account
2. Click on it to open details
3. Go to the **Keys** tab
4. Click **Add Key** > **Create new key**
5. Choose **JSON** format and click **Create**
6. The JSON file will download automatically

## Step 5: Configure the Application

### Option A: Using JSON Key File (Recommended)
1. Copy the downloaded JSON file to your `express-server` directory
2. Rename it to something like `google-credentials.json`
3. Update your `.env` file:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
   ```

### Option B: Using JSON Content Directly
1. Open the downloaded JSON file in a text editor
2. Copy the entire JSON content
3. Update your `.env` file:
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}
   ```

## Step 6: Test the Setup
1. Start your backend server: `cd express-server && npm start`
2. Visit: `http://localhost:4000/api/health`
3. Check that `googleCloud.configured` is `true`

## Example .env File
```env
# Option A: Using file path
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

# Option B: Using JSON content (uncomment and replace with your JSON)
# GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"speech-transcriber@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/speech-transcriber%40your-project.iam.gserviceaccount.com"}

PORT=4000
NODE_ENV=development
```

## Security Notes
- Never commit the JSON key file to version control
- Add `google-credentials.json` to your `.gitignore` file
- Keep your service account key secure and rotate it regularly
- Use the minimum required permissions (Cloud Speech Client role)

## Troubleshooting
- **Authentication Error**: Check if the JSON file path is correct
- **Permission Denied**: Ensure the service account has Cloud Speech Client role
- **API Not Enabled**: Make sure Speech-to-Text API is enabled in your project
- **Quota Exceeded**: Check your API usage limits in Google Cloud Console

## Free Tier Limits
Google Cloud Speech-to-Text provides:
- 60 minutes of audio processing per month for free
- After that, standard pricing applies

For more details, visit: https://cloud.google.com/speech-to-text/pricing
