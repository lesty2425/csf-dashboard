const REGION = "ap-southeast-1";
const USER_POOL_ID = "ap-southeast-1_2GP2VeU1m";
const CLIENT_ID = "14ogj9aammkrug4l8fk4s48pg7";
const IDENTITY_POOL_ID = "ap-southeast-1:71a3f001-c3fb-457e-b454-9354d2267ba5";
const BUCKET_NAME = "cs-notesfiles";

let currentUser = {
  name: '',
  email: '',
  avatar: '',
  identityId: ''
};

// Add the missing initUI function
function initUI() {
  initTabs();
  initDropdown();
  updateUserDisplay();
}

// ======= INITIALIZATION =======
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initAuth();
    initUI();
  } catch (error) {
    console.error("Initialization error:", error);
    showPage('login-page');
  }
});

async function initAuth() {
  const userPool = new AmazonCognitoIdentity.CognitoUserPool({
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID
  });

  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) {
    showPage('login-page');
    return;
  }

  try {
    const session = await new Promise((resolve, reject) => {
      cognitoUser.getSession((err, session) => {
        if (err || !session?.isValid?.()) {
          reject(err || new Error("Invalid session"));
        } else {
          resolve(session);
        }
      });
    });

    await setAWSCredentials(session.getIdToken().getJwtToken());
    await loadUserAttributes(cognitoUser);
    initFileManager();
    showPage('dashboard-page');

  } catch (err) {
    console.error("Auth error:", err);
    showPage('login-page');
  }
}

async function setAWSCredentials(idToken) {
  AWS.config.region = REGION;
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IDENTITY_POOL_ID,
    Logins: {
      [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken
    }
  });

  try {
    await AWS.config.credentials.getPromise();
    currentUser.identityId = AWS.config.credentials.identityId.split(':')[1];
  } catch (err) {
    console.error("Error setting AWS credentials:", err);
    throw err;
  }
}

async function loadUserAttributes(cognitoUser) {
  try {
    const attributes = await new Promise((resolve, reject) => {
      cognitoUser.getUserAttributes((err, attrs) => err ? reject(err) : resolve(attrs));
    });

    const attrMap = {};
    attributes.forEach(attr => attrMap[attr.getName()] = attr.getValue());

    currentUser = {
      ...currentUser,
      name: attrMap.name || attrMap.email.split('@')[0],
      email: attrMap.email,
      avatar: (attrMap.name?.[0] || attrMap.email?.[0] || 'U').toUpperCase()
    };
  } catch (err) {
    console.error("Error loading user attributes:", err);
    throw err;
  }
}

// ======= FILE OPERATIONS =======
function initFileManager() {
  const fileInput = document.getElementById('fileInput');
  const refreshBtn = document.getElementById('refreshFiles');
  
  if (fileInput && refreshBtn) {
    fileInput.addEventListener('change', handleFileUpload);
    refreshBtn.addEventListener('click', refreshFileList);
    refreshFileList();
  }
}

async function handleFileUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  console.log("Files selected:", files); 

try {
    const s3 = new AWS.S3();
    const uploadPromises = files.map(file => {
      const key = `private/${currentUser.identityId}/${file.name}`;
      console.log("Uploading file:", file.name, "to key:", key); // Debug
      
      return s3.upload({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: file.type
      }).promise()
        .then(data => {
          console.log("Upload success:", data.Location); // Debug
          return data;
        });
    });

    await Promise.all(uploadPromises);
    alert(`${files.length} files uploaded successfully!`);
    refreshFileList();
  } catch (err) {
    console.error("Upload failed:", err);
    alert(`Upload failed: ${err.message}`);
  }
}


async function refreshFileList() {
  try {
    const s3 = new AWS.S3();
    console.log("Refreshing file list for identity:", currentUser.identityId); // Debug
    
    const data = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: `private/${currentUser.identityId}/`
    }).promise();

    console.log("S3 response:", data); // Debug
    
    if (data.Contents && data.Contents.length > 0) {
      const files = data.Contents.filter(file => !file.Key.endsWith('/'));
      console.log("Filtered files:", files); // Debug
      displayFiles(files);
    } else {
      console.log("No files found in bucket");
      displayFiles([]);
    }
  } catch (err) {
    console.error("File list error:", err);
    alert("Error loading files. Check console for details.");
  }
}

function displayFiles(files) {
  const container = document.getElementById('file-list');
  if (container) {
    container.innerHTML = files.map(file => `
      <div class="file-item">
        <span>${file.Key.split('/').pop()}</span>
        <button onclick="downloadFile('${file.Key.replace(/'/g, "\\'")}')">Download</button>
        <button onclick="deleteFile('${file.Key.replace(/'/g, "\\'")}')">Delete</button>
      </div>
    `).join('');
  }
}

async function downloadFile(key) {
  try {
    const s3 = new AWS.S3();
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: 60
    });
    window.open(url, '_blank');
  } catch (err) {
    console.error("Download error:", err);
    alert("Download failed. Check console for details.");
  }
}

async function deleteFile(key) {
  if (!confirm(`Delete ${key.split('/').pop()} permanently?`)) return;
  
  try {
    const s3 = new AWS.S3();
    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: key
    }).promise();
    refreshFileList();
  } catch (err) {
    console.error("Delete error:", err);
    alert("Delete failed. Check console for details.");
  }
}

// ======= UI FUNCTIONS =======
function updateUserDisplay() {
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');
  
  if (nameEl) nameEl.textContent = currentUser.name;
  if (emailEl) emailEl.textContent = currentUser.email;
  if (avatarEl) avatarEl.textContent = currentUser.avatar;
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
}

// ======= Tab Switching =======
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  if (tabs.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Remove active class from all
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Activate clicked tab
      this.classList.add('active');
      const targetId = this.getAttribute('data-tab');
      document.getElementById(targetId)?.classList.add('active');
    });
  });
}

// ======= Dropdown Menu =======
function initDropdown() {
  const profile = document.getElementById('user-profile');
  const dropdown = document.getElementById('dropdown-menu');

  if (profile && dropdown) {
    // Toggle menu on profile click
    profile.addEventListener('click', function(e) {
      e.stopPropagation();
      this.classList.toggle('open');
      dropdown.classList.toggle('open');
    });

    // Close when clicking outside
    document.addEventListener('click', function() {
      if (dropdown.classList.contains('open')) {
        dropdown.classList.remove('open');
        profile.classList.remove('open');
      }
    });
  }
}

window.signOut = function() {
  const userPool = new AmazonCognitoIdentity.CognitoUserPool({
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID
  });
  
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
    AWS.config.credentials.clearCachedId();
  }
  window.location.href = "https://bit.ly/409eKBJ";
};

// Initialize AWS SDK (must be in global scope)
const AWS = window.AWS;
AWS.config.region = REGION;

// Make functions available globally
window.downloadFile = downloadFile;
window.deleteFile = deleteFile;
