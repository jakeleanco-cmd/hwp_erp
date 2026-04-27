const { getDriveService, getOrCreateAppFolder } = require('./server/config/googleDriveConfig');
require('dotenv').config();

async function checkDrive() {
  try {
    const drive = getDriveService();
    const folderId = await getOrCreateAppFolder();
    
    console.log(`Checking folder ID: ${folderId}`);
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc'
    });
    
    const files = response.data.files;
    if (files.length === 0) {
      console.log('No files found in the folder.');
    } else {
      console.log(`Found ${files.length} files:`);
      files.forEach(file => {
        console.log(`- ${file.name} (ID: ${file.id}, Created: ${file.createdTime})`);
      });
    }
  } catch (error) {
    console.error('Error checking Google Drive:', error.message);
  }
}

checkDrive();
