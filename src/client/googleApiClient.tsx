// import { sheets } from "@googleapis/sheets";
// import { OAuth2Client } from 'google-auth-library';

// const CLIENT_ID = '337640530335-85k0ifb0bq4mm63qungn860fm67bniir.apps.googleusercontent.com';
// const CLIENT_SECRET = "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";
// const API_KEY = "AIzaSyDg8UhNO0hCyeS2Vij-4ziAVZAv7JldkqY";
// const GOOGLE_TOKEN_STORAGE_KEY = "google_token"

// // Discovery doc URL for APIs used by the quickstart
// const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

// // Authorization scopes required by the API; multiple scopes can be
// // included, separated by spaces.
// const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// const oAuth2Client = new OAuth2Client(
//     CLIENT_ID,
//     CLIENT_SECRET,
//     "http://localhost:3000/"
// );

// // 6. Call this function to start the OAuth flow
// function startAuthProcess(): string {
//     if (localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY)) {
//         return localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY)!
//     }
//     // 1. Generate the URL for Google OAuth2 Consent Screen
//     const authUrl = oAuth2Client.generateAuthUrl({
//         access_type: 'offline',
//         scope: SCOPES,
//     });

//     // 2. Redirect the user to Google's consent screen
//     window.location.href = authUrl

//     return ""
// }

// // 3. After redirect, extract the authorization code from URL
// function extractCodeFromUrl(): string | null {
//     const params = new URLSearchParams(window.location.search);
//     return params.get('code');
// }


// // 4. Exchange authorization code for tokens (run after redirect)
// async function getAccessToken(code: string): Promise<string> {
//     try {
//         const { tokens } = await oAuth2Client.getToken(code);
//         oAuth2Client.setCredentials(tokens);
//         console.log('Access Token:', tokens);
//         // Store token in localStorage or make API calls
//         return tokens.access_token!;
//     } catch (error) {
//         console.error('Error retrieving access token:', error);
//         throw Error(`Unable to retrieve access token: ${error}`);
//     }
// }

// // 7. Run this when the page loads to check for the authorization code in the URL
// export async function handleRedirect(): Promise<string> {
//     const code = extractCodeFromUrl();
//     if (code) {
//         const accessToken = await getAccessToken(code);
//         localStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, accessToken);
//         return accessToken
//     } else {
//         return startAuthProcess()
//     }
// }

// export class GoogleApiClientWrapper {

//     oAuth2Client: OAuth2Client
//     constructor(oAuth2Client: OAuth2Client) {
//         this.oAuth2Client = oAuth2Client
//     }

//     // 5. Create a new Google Spreadsheet with 4 sheets
//     createSpreadsheetWithSheets(title: string, csvFiles: string[]) {
//         const sheetsClient = sheets({ version: 'v4', auth: this.oAuth2Client });
    
//         const request = {
//             requestBody: {
//                 properties: {
//                     title: title,
//                 },
//                 sheets: [
//                     { properties: { title: 'Sheet 1' } },
//                     { properties: { title: 'Sheet 2' } },
//                     { properties: { title: 'Sheet 3' } },
//                     { properties: { title: 'Sheet 4' } },
//                 ],
//             },
//         };
    
//         try {
//             const response = sheetsClient.spreadsheets.create(request, (response: any) => {
//                 console.log('Spreadsheet URL:', response.data.spreadsheetUrl);
//             });
//             console.log('Spreadsheet URL:', response);
//         } catch (error) {
//             console.error('Error creating spreadsheet:', error);
//         }
//     }
// }

// export const GOOGLE_API_CLIENT_WRAPPER = new GoogleApiClientWrapper(oAuth2Client)