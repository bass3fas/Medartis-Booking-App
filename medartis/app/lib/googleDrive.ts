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
    if (!fileIdOrUrl || !fileIdOrUrl.trim()) {
      return { success: true, skipped: true };
    }

    const webAppUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!webAppUrl) {
      throw new Error('GOOGLE_APPS_SCRIPT_URL is not defined in environment variables.');
    }

    // 1. Extract raw file identifier or filename if path/URL was passed
    let cleanFileId = fileIdOrUrl.trim();
    let fileName = '';

    if (cleanFileId.includes('fileName=')) {
      try {
        const urlObj = new URL(cleanFileId);
        const rawFileName = urlObj.searchParams.get('fileName');
        if (rawFileName) {
          cleanFileId = decodeURIComponent(rawFileName);
        }
      } catch (e) {
        // Fallback cleanup
      }
    }

    // Extract bare filename without any folder prefix (e.g. "Usage Photos_Images/photo.jpg" -> "photo.jpg")
    fileName = cleanFileId.split('/').pop() || cleanFileId;

    // 2. Call Web App with both fileId and fileName so Apps Script can fallback dynamically
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        fileId: cleanFileId,
        fileName: fileName,
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