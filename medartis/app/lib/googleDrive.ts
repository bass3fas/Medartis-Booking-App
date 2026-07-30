// lib/googleDrive.ts

export async function uploadPhotoToDrive(file: File, fileName: string, parentFolderId: string) {
  try {
    // 1. Convert binary File to Base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!webAppUrl) {
      throw new Error('GOOGLE_APPS_SCRIPT_URL is not defined in environment variables.');
    }

    // 2. Send payload to Apps Script Web App
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'upload', // 👈 Explicit action routing
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

export async function deletePhotoFromDrive(fileIdOrUrl: string) {
  try {
    const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!webAppUrl) {
      throw new Error('GOOGLE_APPS_SCRIPT_URL is not defined in environment variables.');
    }

    // 1. Safeguard: Extract raw file identifier if an AppSheet URL was passed accidentally
    let cleanFileId = fileIdOrUrl;
    if (cleanFileId.includes('fileName=')) {
      try {
        const urlObj = new URL(cleanFileId);
        const rawFileName = urlObj.searchParams.get('fileName');
        if (rawFileName) {
          // Removes "BookingSets_Images/" prefix if present
          cleanFileId = decodeURIComponent(rawFileName).split('/').pop() || cleanFileId;
        }
      } catch (e) {
        // Fallback cleanup
        cleanFileId = cleanFileId.split('/').pop() || cleanFileId;
      }
    }

    // 2. Call Web App
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        fileId: cleanFileId,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to delete file from Google Drive.');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting photo via Apps Script:', error);
    throw new Error(`Google Drive deletion failed: ${error.message}`);
  }
}
export async function copyPhotoInDrive(fileNameOrPath: string, newFileName: string, targetFolderId: string) {
  const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (!webAppUrl) {
    throw new Error('GOOGLE_APPS_SCRIPT_URL is not defined in environment variables.');
  }

  const sourceFileName = fileNameOrPath.split('/').pop() || fileNameOrPath;
  const response = await fetch(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'copy',
      sourceFileName,
      fileName: newFileName,
      folderId: targetFolderId,
    }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Apps Script failed to copy image.');
  }

  return { id: data.fileId, name: newFileName, webViewLink: data.url };
}
