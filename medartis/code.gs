//https://script.google.com/home/projects/
//to be uploaded for google drive access to add and delete photos


function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'upload'; // Default action is upload

    // 🔴 ACTION: DELETE FILE
    if (action === 'delete') {
      var rawInput = data.fileId || data.fileName || '';
      
      if (!rawInput) {
        throw new Error("Missing 'fileId' or 'fileName' parameter for deletion.");
      }

      // Extract bare filename if a path like "Usage Photos_Images/photo.jpeg" was passed
      var cleanFileName = rawInput.split('/').pop();
      var fileToDelete = null;

      // 1. Try finding file directly by Drive ID (only if rawInput doesn't contain slashes or dots)
      if (rawInput.indexOf('/') === -1 && rawInput.indexOf('.') === -1) {
        try {
          fileToDelete = DriveApp.getFileById(rawInput);
        } catch (err) {
          fileToDelete = null;
        }f
      }

      // 2. Fallback: Search by file name if getFileById didn't find it or rawInput was a path/filename
      if (!fileToDelete && cleanFileName) {
        var files = DriveApp.getFilesByName(cleanFileName);
        if (files.hasNext()) {
          fileToDelete = files.next();
        }
      }

      if (!fileToDelete) {
        throw new Error("File not found for deletion: " + cleanFileName);
      }

      fileToDelete.setTrashed(true); // Moves file to trash safely
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "File moved to trash successfully."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 🟢 ACTION: UPLOAD FILE
    if (action === 'upload') {
      var folderId = data.folderId || "1ZxOQywT75TFdSrYcSQqzNG8CgLD8bcuE";
      var folder = DriveApp.getFolderById(folderId);
      
      var blob = Utilities.newBlob(
        Utilities.base64Decode(data.base64), 
        data.mimeType || "image/jpeg", 
        data.fileName
      );
      
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileId: file.getId(),
        url: file.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Invalid action provided.");

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}