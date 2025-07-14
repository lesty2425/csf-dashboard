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

// ======= INITIALIZATION =======
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  initUI();
});

async function initAuth() {
  const userPool = new AmazonCognitoIdentity.CognitoUserPool({
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID
  });

  const cognitoUser = userPool.getCurrentUser();
  if (!cognitoUser) return showPage('login-page');

  try {
    const session = await new Promise((resolve, reject) => {
      cognitoUser.getSession((err, session) => {
        err || !session?.isValid?.() ? reject(err) : resolve(session);
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

  await AWS.config.credentials.getPromise();
  currentUser.identityId = AWS.config.credentials.identityId.split(':')[1];
}

async function loadUserAttributes(cognitoUser) {
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
  updateUserDisplay();
}

// ======= FILE OPERATIONS =======
function initFileManager() {
  document.getElementById('fileInput').addEventListener('change', handleFileUpload);
  document.getElementById('refreshFiles').addEventListener('click', refreshFileList);
  refreshFileList();
}

async function handleFileUpload(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  try {
    await Promise.all(files.map(file => {
      return new AWS.S3().upload({
        Bucket: BUCKET_NAME,
        Key: `private/${currentUser.identityId}/${file.name}`,
        Body: file,
        ContentType: file.type
      }).promise();
    }));
    alert(`${files.length} files uploaded`);
    refreshFileList();
  } catch (err) {
    console.error("Upload failed:", err);
    alert("Upload failed. Check console for details.");
  }
}

async function refreshFileList() {
  try {
    const data = await new AWS.S3().listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: `private/${currentUser.identityId}/`
    }).promise();

    displayFiles(data.Contents.filter(file => !file.Key.endsWith('/')));
  } catch (err) {
    console.error("File list error:", err);
  }
}

function displayFiles(files) {
  const container = document.getElementById('file-list');
  container.innerHTML = files.map(file => `
    <div class="file-item">
      <span>${file.Key.split('/').pop()}</span>
      <button onclick="downloadFile('${file.Key}')">Download</button>
      <button onclick="deleteFile('${file.Key}')">Delete</button>
    </div>
  `).join('');
}

async function downloadFile(key) {
  try {
    const url = await new AWS.S3().getSignedUrlPromise('getObject', {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: 60
    });
    window.open(url, '_blank');
  } catch (err) {
    console.error("Download error:", err);
  }
}

async function deleteFile(key) {
  if (!confirm(`Delete ${key.split('/').pop()} permanently?`)) return;
  
  try {
    await new AWS.S3().deleteObject({
      Bucket: BUCKET_NAME,
      Key: key
    }).promise();
    refreshFileList();
  } catch (err) {
    console.error("Delete error:", err);
  }
}

// ======= UI FUNCTIONS =======
function updateUserDisplay() {
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = currentUser.avatar;
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
}
// ======= Tab Switching =======
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
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
  
  userPool.getCurrentUser()?.signOut();
  AWS.config.credentials.clearCachedId();
  window.location.href = "https://bit.ly/409eKBJ";
};

// Initialize AWS SDK (must be in global scope)
const AWS = window.AWS;
AWS.config.region = REGION;
