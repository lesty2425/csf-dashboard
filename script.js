// ===== CONFIGURATION =====
const CONFIG = {
  REGION: "ap-southeast-1",
  USER_POOL_ID: "ap-southeast-1_2GP2VeU1m",
  CLIENT_ID: "14ogj9aammkrug4l8fk4s48pg7",
  IDENTITY_POOL_ID: "ap-southeast-1:71a3f001-c3fb-457e-b454-9354d2267ba5",
  BUCKET_NAME: "cs-notesfiles",
  REDIRECT_URI: "https://main.d1gzxpmu3efm8i.amplifyapp.com/",
  COGNITO_DOMAIN: "ap-southeast-12gp2veu1m.auth.ap-southeast-1.amazoncognito.com"
};

// ===== GLOBAL STATE =====
let currentUser = {
  name: '',
  email: '',
  avatar: '',
  identityId: ''
};

// ===== AWS & COGNITO INITIALIZATION =====
const AWS = window.AWS;
AWS.config.region = CONFIG.REGION;

const auth = new AmazonCognitoIdentity.CognitoAuth({
  ClientId: CONFIG.CLIENT_ID,
  AppWebDomain: CONFIG.COGNITO_DOMAIN,
  TokenScopesArray: ["email", "openid", "profile"],
  RedirectUriSignIn: CONFIG.REDIRECT_URI,
  RedirectUriSignOut: CONFIG.REDIRECT_URI
});

auth.userhandler = {
  onSuccess: async function(result) {
    try {
      const session = auth.getSignInUserSession();
      const idToken = session.getIdToken().getJwtToken();
      
      await setAWSCredentials(idToken);
      await loadUserAttributes(session);
      
      initUI();
      initFileManager();
      showPage('dashboard-page');
      
      // Test S3 connection (remove in production if not needed)
      await testS3Connection();
    } catch (error) {
      console.error("Authentication success handler error:", error);
      showAuthError("Failed to initialize session");
      showPage('login-page');
    }
  },
  onFailure: function(err) {
    console.error("Authentication failure:", err);
    showAuthError("Login failed. Please try again.");
    showPage('login-page');
  }
};

// ===== CORE FUNCTIONS =====
async function setAWSCredentials(idToken) {
  return new Promise((resolve, reject) => {
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: CONFIG.IDENTITY_POOL_ID,
      Logins: {
        [`cognito-idp.${CONFIG.REGION}.amazonaws.com/${CONFIG.USER_POOL_ID}`]: idToken
      }
    });

    AWS.config.credentials.get(err => {
      if (err) {
        console.error("AWS Credentials Error:", err);
        reject(new Error("Failed to get AWS credentials"));
      } else {
        currentUser.identityId = AWS.config.credentials.identityId.split(':')[1];
        console.log("AWS credentials set successfully");
        resolve();
      }
    });
  });
}

async function loadUserAttributes(session) {
  try {
    const payload = JSON.parse(atob(session.getIdToken().getJwtToken().split('.')[1]));
    currentUser = {
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      avatar: (payload.name?.[0] || payload.email?.[0] || 'U').toUpperCase(),
      identityId: currentUser.identityId
    };
    updateUserDisplay();
  } catch (error) {
    console.error("Error loading user attributes:", error);
    throw new Error("Failed to load user profile");
  }
}

// ===== FILE OPERATIONS =====
async function handleFileUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  const s3 = new AWS.S3();
  const uploadResults = [];

  for (const file of files) {
    try {
      const params = {
        Bucket: CONFIG.BUCKET_NAME,
        Key: `private/${currentUser.identityId}/${file.name}`,
        Body: file,
        ContentType: file.type
      };

      const data = await s3.upload(params).promise();
      uploadResults.push({ success: true, file: file.name });
      console.log("Uploaded:", data.Location);
    } catch (err) {
      uploadResults.push({ success: false, file: file.name, error: err.message });
      console.error("Error uploading", file.name, err);
    }
  }

  // Show upload summary
  const successful = uploadResults.filter(r => r.success).length;
  if (successful > 0) {
    alert(`${successful}/${files.length} files uploaded successfully`);
    refreshFileList();
  }
  
  if (successful !== files.length) {
    const failed = uploadResults.filter(r => !r.success);
    console.log("Failed uploads:", failed);
    alert(`${files.length - successful} files failed to upload`);
  }

  document.getElementById('fileInput').value = '';
}

async function refreshFileList() {
  try {
    const s3 = new AWS.S3();
    const data = await s3.listObjectsV2({
      Bucket: CONFIG.BUCKET_NAME,
      Prefix: `private/${currentUser.identityId}/`
    }).promise();

    displayFiles(data.Contents?.filter(file => !file.Key.endsWith('/')) || []);
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
      Bucket: CONFIG.BUCKET_NAME,
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
      Bucket: CONFIG.BUCKET_NAME,
      Key: key
    }).promise();
    refreshFileList();
  } catch (err) {
    console.error("Delete error:", err);
    alert("Delete failed. Check console for details.");
  }
}

// ===== UI FUNCTIONS =====
function initUI() {
  // Initialize tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      this.classList.add('active');
      const targetId = this.getAttribute('data-tab');
      document.getElementById(targetId)?.classList.add('active');
    });
  });

  // Initialize dropdown
  const profile = document.getElementById('user-profile');
  const dropdown = document.getElementById('dropdown-menu');
  
  if (profile && dropdown) {
    profile.addEventListener('click', function(e) {
      e.stopPropagation();
      this.classList.toggle('open');
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', function() {
      if (dropdown.classList.contains('open')) {
        dropdown.classList.remove('open');
        profile.classList.remove('open');
      }
    });
  }

  updateUserDisplay();
}

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

function showAuthError(message) {
  const errorDiv = document.getElementById('auth-error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  } else {
    alert("Error: " + message);
  }
}

// ===== INITIALIZATION =====
function initAuth() {
  if (window.location.href.includes("code=")) {
    auth.parseCognitoWebResponse(window.location.href);
  } else {
    const userPool = new AmazonCognitoIdentity.CognitoUserPool({
      UserPoolId: CONFIG.USER_POOL_ID,
      ClientId: CONFIG.CLIENT_ID
    });
    
    if (!userPool.getCurrentUser()) {
      showPage('login-page');
    }
  }
}

function initFileManager() {
  const fileInput = document.getElementById('fileInput');
  const refreshBtn = document.getElementById('refreshFiles');
  
  if (fileInput && refreshBtn) {
    fileInput.addEventListener('change', handleFileUpload);
    refreshBtn.addEventListener('click', refreshFileList);
    refreshFileList();
  }
}

async function testS3Connection() {
  try {
    const s3 = new AWS.S3();
    await s3.listObjectsV2({
      Bucket: CONFIG.BUCKET_NAME,
      Prefix: `private/${currentUser.identityId}/`,
      MaxKeys: 1
    }).promise();
    console.log("S3 connection test successful");
  } catch (error) {
    console.error("S3 connection test failed:", error);
    throw error;
  }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
  // Initialize UI first
  initUI();
  
  // Setup login button if on login page
  const loginBtn = document.getElementById('login-button');
  if (loginBtn) {
    loginBtn.addEventListener('click', function() {
      auth.getSession();
    });
  }
  
  // Then handle authentication
  initAuth();
});

// ===== GLOBAL FUNCTIONS =====
window.signOut = function() {
  auth.signOut();
  AWS.config.credentials.clearCachedId();
  window.location.href = CONFIG.REDIRECT_URI;
};

window.downloadFile = downloadFile;
window.deleteFile = deleteFile;
