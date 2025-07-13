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
    document.getElementById('user-name').textContent = currentUser.name || "User";
    document.getElementById('user-email').textContent = currentUser.email || "user@example.com";
    document.getElementById('user-avatar').textContent = currentUser.avatar || "U";
}

// Page navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
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

// User dropdown menu
document.getElementById('user-profile').addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('dropdown-menu');
    this.classList.toggle('open');
    dropdown.classList.toggle('open');
});

// Close dropdown if click outside
document.addEventListener('click', function() {
    const dropdown = document.getElementById('dropdown-menu');
    const profile = document.getElementById('user-profile');
    
    if (dropdown.classList.contains('open')) {
        dropdown.classList.remove('open');
        profile.classList.remove('open');
    }
});

// Tabs functionality
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        document.getElementById(target).classList.add('active');
    });
});

// Sign out function
function signOut() {
    if (confirm('Are you sure you want to sign out?')) {
        if (cognitoUser) {
            cognitoUser.signOut();
        }
        currentUser = { name: '', email: '', avatar: '' };
        showPage('login-page');
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
            }
        });
    });
}

function downloadFile(fileName) {
    getUserPrefix(function(userId) {
        if (!userId) return;
        const s3 = new AWS.S3();
        const params = {
            Bucket: BUCKET_NAME,
            Key: `${userId}/${fileName}`
        };
        s3.getSignedUrl('getObject', params, function(err, url) {
            if (err) {
                console.error("Download error:", err);
            } else {
                window.open(url);
            }
        });
    });
}

function deleteFile(fileName) {
    getUserPrefix(function(userId) {
        if (!userId) return;
        const s3 = new AWS.S3();
        const params = {
            Bucket: BUCKET_NAME,
            Key: `${userId}/${fileName}`
        };
        s3.deleteObject(params, function(err, data) {
            if (err) {
                console.error("Delete error:", err);
            } else {
                console.log("Delete success");
            }
        });
    });
}
