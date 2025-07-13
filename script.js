const REGION = "ap-southeast-1";
const USER_POOL_ID = "ap-southeast-1_2GP2VeU1m";
const CLIENT_ID = "14ogj9aammkrug4l8fk4s48pg7";
const IDENTITY_POOL_ID = "ap-southeast-1:71a3f001-c3fb-457e-b454-9354d2267ba5";
const BUCKET_NAME = "cs-notesfiles";

// Initialize Cognito User Pool
const poolData = {
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
let cognitoUser = userPool.getCurrentUser();

// Global User Data
let currentUser = {
    name: '',
    email: '',
    avatar: ''
};

// Configure AWS credentials using Cognito Identity
function setAWSCredentials(idTokenJwt) {
    AWS.config.region = REGION;
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IDENTITY_POOL_ID,
        Logins: {
            [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idTokenJwt
        }
    });

    AWS.config.credentials.get(function(err) {
        if (err) {
            console.error("Error getting AWS credentials", err);
        } else {
            console.log("AWS credentials set");
        }
    });
}

// Update user display in UI
function updateUserDisplay() {
    const nameElement = document.getElementById('user-name');
    const emailElement = document.getElementById('user-email');
    const avatarElement = document.getElementById('user-avatar');
    
    document.getElementById('user-name').textContent = currentUser.name || "User";
    document.getElementById('user-email').textContent = currentUser.email || "user@example.com";
    document.getElementById('user-avatar').textContent = currentUser.avatar || "U";
}

// Page navigation
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    if (!pages.length) return;
    
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (cognitoUser) {
        cognitoUser.getSession(function(err, session) {
            if (err || !session.isValid()) {
                showPage('login-page');
                return;
            }

            // Set AWS credentials
            const idToken = session.getIdToken().getJwtToken();
            setAWSCredentials(idToken);

            // Get user attributes
            cognitoUser.getUserAttributes(function(err, attributes) {
                if (err) {
                    console.error("Error getting user attributes:", err);
                    updateUserDisplay();
                    return;
                }

                // Reset user data
                currentUser = { name: '', email: '', avatar: '' };

                // Extract Cognito attributes
                attributes.forEach(attr => {
                    if (attr.getName() === 'name') currentUser.name = attr.getValue();
                    if (attr.getName() === 'email') currentUser.email = attr.getValue();
                });

                // Generate avatar initials
                currentUser.avatar = currentUser.name
                    .split(' ')
                    .map(word => word[0] || '')
                    .join('')
                    .toUpperCase() || 
                    (currentUser.email ? currentUser.email[0].toUpperCase() : 'U');

                updateUserDisplay();
                showPage('dashboard-page');
            });
        });
    } else {
        showPage('login-page');
    }
});

//dropdown meny funtion
document.addEventListener('DOMContentLoaded', function() {
    const profileElement = document.getElementById('user-profile');
    const dropdownElement = document.getElementById('dropdown-menu');
    
    if (profileElement && dropdownElement) {
        profileElement.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('open');
            dropdownElement.classList.toggle('open');
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#user-profile') && dropdownElement) {
            dropdownElement.classList.remove('open');
            if (profileElement) profileElement.classList.remove('open');
        }
    });
});

//tab switching functiion
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (tabs.length && tabContents.length) {
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Hide all tab contents
                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                
                // Show the corresponding content
                const targetId = this.getAttribute('data-tab');
                const targetContent = document.getElementById(targetId);
                if (targetContent) targetContent.classList.add('active');
            });
        });
    }
});

// Sign out function
function signOut() {
    if (confirm('Are you sure you want to sign out?')) {
        if (cognitoUser) {
            cognitoUser.signOut();
        }
        currentUser = { name: '', email: '', avatar: '' };
        showPage('login-page');
        // Clear any existing session data
        window.location.href = "https://bit.ly/409eKBJ";
    }
}

// Usage stats
function updateUsage(files, notes, storage) {
    document.getElementById('files-progress').value = (files / 1000) * 100;
    document.getElementById('notes-progress').value = (notes / 500) * 100;
    document.getElementById('storage-progress').value = (storage / 50) * 100;

    document.getElementById('files-count').textContent = `${files} / 1,000`;
    document.getElementById('notes-count').textContent = `${notes} / 500`;
    document.getElementById('storage-count').textContent = `${storage} GB / 50 GB`;
}

// Button animations
document.querySelectorAll('.upload-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.style.transform = 'scale(0.95)';
        setTimeout(() => {
            e.target.style.transform = '';
        }, 150);
    });
});

// S3 Helper Functions
function getUserPrefix(callback) {
    AWS.config.credentials.get(function(err) {
        if (err) {
            console.error("Unable to get AWS credentials", err);
            callback(null);
        } else {
            const identityId = AWS.config.credentials.identityId;
            const userId = identityId.split(':')[1]; // get Cognito sub ID
            callback(userId);
        }
    });
}

function uploadFile(file) {
    getUserPrefix(function(userId) {
        if (!userId) return;
        const s3 = new AWS.S3();
        const params = {
            Bucket: BUCKET_NAME,
            Key: `${userId}/${file.name}`,
            Body: file
        };
        s3.putObject(params, function(err, data) {
            if (err) {
                console.error("Upload error:", err);
            } else {
                console.log("Upload success:", data);
                listUserFiles(userId);
            }
        });
    });
}

function listUserFiles(userId) {
  const s3 = new AWS.S3();
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: `${userId}/`
  };

  s3.listObjectsV2(params, function(err, data) {
    if (err) {
      console.error("List error:", err);
      return;
    }

    const fileList = data.Contents || [];
    let totalSizeBytes = 0;

    // Clear current display
    const storageBox = document.getElementById("your-file-list-box-id"); // replace with actual element ID
    storageBox.innerHTML = '';

    // Render file names
    fileList.forEach(obj => {
      const fileName = obj.Key.split('/').pop(); // remove prefix
      if (fileName) {
        const item = document.createElement("div");
        item.textContent = fileName;
        storageBox.appendChild(item);
        totalSizeBytes += obj.Size;
      }
    });

    // Update usage bar
    updateUsage(fileList.length, 0, (totalSizeBytes / (1024 ** 3)).toFixed(2)); // GB
  });
}


// function downloadFile(fileName) {
//     getUserPrefix(function(userId) {
//         if (!userId) return;
//         const s3 = new AWS.S3();
//         const params = {
//             Bucket: BUCKET_NAME,
//             Key: `${userId}/${fileName}`
//         };
//         s3.getSignedUrl('getObject', params, function(err, url) {
//             if (err) {
//                 console.error("Download error:", err);
//             } else {
//                 window.open(url);
//             }
//         });
//     });
// }

// function deleteFile(fileName) {
//     getUserPrefix(function(userId) {
//         if (!userId) return;
//         const s3 = new AWS.S3();
//         const params = {
//             Bucket: BUCKET_NAME,
//             Key: `${userId}/${fileName}`
//         };
//         s3.deleteObject(params, function(err, data) {
//             if (err) {
//                 console.error("Delete error:", err);
//             } else {
//                 console.log("Delete success");
//             }
//         });
//     });
// }
