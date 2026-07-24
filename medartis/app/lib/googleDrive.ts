// lib/googleDrive.ts

export async function uploadPhotoToDrive(file: File, fileName: string, parentFolderId: string) {
  try {
    // 1. Convert the uploaded binary File to Base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!webAppUrl) {
      throw new Error('GOOGLE_APPS_SCRIPT_URL is not defined in environment variables.');
    }

    // 2. Send the file payload to your Apps Script Web App
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64: base64Data,
        fileName: fileName,
        mimeType: file.type || 'image/jpeg',
        folderId: parentFolderId,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Apps Script failed to upload image.');
    }

    // Returns { fileId, url, name }
    return {
      id: data.fileId,
      name: fileName,
      webViewLink: data.url,
      webContentLink: data.url,
    };
  } catch (error: any) {
    console.error('Error in Apps Script upload bridge:', error);
    throw new Error(`Google Drive upload failed: ${error.message}`);
  }
}