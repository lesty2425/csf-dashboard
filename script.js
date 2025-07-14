const REGION = "ap-southeast-1";
const USER_POOL_ID = "ap-southeast-1_2GP2VeU1m";
const CLIENT_ID = "14ogj9aammkrug4l8fk4s48pg7";
const IDENTITY_POOL_ID = "ap-southeast-1:71a3f001-c3fb-457e-b454-9354d2267ba5";
const BUCKET_NAME = "cs-notesfiles";

const authData = {
    ClientId: CLIENT_ID,
    AppWebDomain: "ap-southeast-1_2GP2VeU1m.auth.ap-southeast-1.amazoncognito.com",
    TokenScopesArray: ["email", "openid", "profile"],
    RedirectUriSignIn: "https://lesty2425.github.io/csf-dashboard/",
    RedirectUriSignOut: "https://lesty2425.github.io/csf-dashboard/"
};

const auth = new AmazonCognitoIdentity.CognitoAuth(authData);
auth.userhandler = {
    onSuccess: function(result) {
        console.log("Cognito Auth success");
        location.reload(); // Reload so getCurrentUser() can be picked up
    },
    onFailure: function(err) {
        console.error("Cognito Auth failure:", err);
        showPage('login-page');
    }
};

// Check if coming back from Hosted UI login
if (window.location.href.includes("code=")) {
    auth.parseCognitoWebResponse(window.location.href);
}

// Initialize Cognito User Pool
const poolData = {
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
// let cognitoUser = userPool.getCurrentUser();

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
document.addEventListener('DOMContentLoaded', function () {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
        console.warn("No Cognito user found");
        showPage('login-page');
        return;
    }
    
    console.log("Getting current user:", cognitoUser);

    cognitoUser.getSession(function (err, session) {
        console.log("Cognito session:", session);
        console.log("ID token:", session.getIdToken().getJwtToken());
        
        if (err || !session.isValid()) {
            console.error("Session error or invalid:", err);
            showPage('login-page');
            return;
        }

        const idToken = session.getIdToken().getJwtToken();
        setAWSCredentials(idToken);

        cognitoUser.getUserAttributes(function (err, attributes) {
            if (err) {
                console.error("Error getting attributes:", err);
                updateUserDisplay(); // fallback
                return;
            }

            currentUser = { name: '', email: '', avatar: '' };

            attributes.forEach(attr => {
                if (attr.getName() === 'name') currentUser.name = attr.getValue();
                if (attr.getName() === 'email') currentUser.email = attr.getValue();
            });

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
        const user = userPool.getCurrentUser();
        if (user) {
            user.signOut();
            console.log("Signed out from Cognito");
        } else {
            console.warn("No Cognito user found at signout");
        }

        currentUser = { name: '', email: '', avatar: '' };
        showPage('login-page');
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

// Initialize file upload when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize file upload
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFileUpload);
    
    // Load existing files if user is authenticated
    if (cognitoUser) {
        cognitoUser.getSession(function(err, session) {
            if (!err && session.isValid()) {
                getUserPrefix(listUserFiles);
            }
        });
    }
});

function handleFileUpload(e) {
    const files = e.target.files;
    for (let i = 0; i < files.length; i++) {
        uploadFile(files[i]);
    }
    e.target.value = ''; // Reset input
}

function toggleEmptyState(hasFiles) {
    const emptyState = document.getElementById('empty-storage-state');
    const fileListContainer = document.getElementById('file-list-container');
    
    if (hasFiles) {
        emptyState.style.display = 'none';
        fileListContainer.style.display = 'block';
    } else {
        emptyState.style.display = 'block';
        fileListContainer.style.display = 'none';
    }
}

function uploadFile(file) {
    getUserPrefix(function(userId) {
        if (!userId) return;
        
        // Show upload progress
        const progress = document.createElement('div');
        progress.className = 'upload-progress';
        progress.textContent = `Uploading ${file.name}...`;
        document.getElementById('file-list').prepend(progress);
        
        const s3 = new AWS.S3();
        const params = {
            Bucket: BUCKET_NAME,
            Key: `${userId}/${file.name}`,
            Body: file,
            ContentType: file.type
        };
        
        s3.upload(params)
            .on('httpUploadProgress', function(evt) {
                const percentage = Math.round((evt.loaded * 100) / evt.total);
                progress.textContent = `Uploading ${file.name}: ${percentage}%`;
            })
            .send(function(err, data) {
                if (err) {
                    progress.textContent = `Error uploading ${file.name}`;
                    progress.className = 'upload-error';
                    console.error("Upload error:", err);
                } else {
                    progress.textContent = `Uploaded: ${file.name}`;
                    progress.className = 'upload-success';
                    listUserFiles(userId); // Refresh file list
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
        const fileListElement = document.getElementById('file-list');
        
        // Clear existing files (keep upload status messages)
        const uploadStatusItems = fileListElement.querySelectorAll('.upload-progress, .upload-success, .upload-error');
        fileListElement.innerHTML = '';
        uploadStatusItems.forEach(item => fileListElement.appendChild(item));
        
        // Add files to the list
        fileList.forEach(obj => {
            const fileName = obj.Key.split('/').pop();
            if (fileName) {
                totalSizeBytes += obj.Size;
                
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                
                const fileNameSpan = document.createElement('span');
                fileNameSpan.className = 'file-name';
                fileNameSpan.textContent = fileName;
                
                const fileSizeSpan = document.createElement('span');
                fileSizeSpan.className = 'file-size';
                fileSizeSpan.textContent = formatFileSize(obj.Size);
                
                const fileActions = document.createElement('div');
                fileActions.className = 'file-actions';
                
                const downloadBtn = document.createElement('button');
                downloadBtn.textContent = 'Download';
                downloadBtn.onclick = () => downloadFile(fileName);
                
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete';
                deleteBtn.onclick = () => {
                    if (confirm(`Delete ${fileName}?`)) {
                        deleteFile(fileName);
                    }
                };
                
                fileActions.appendChild(downloadBtn);
                fileActions.appendChild(deleteBtn);
                
                fileItem.appendChild(fileNameSpan);
                fileItem.appendChild(fileSizeSpan);
                fileItem.appendChild(fileActions);
                fileListElement.appendChild(fileItem);
            }
        });

        // Update UI based on whether files exist
        toggleEmptyState(fileList.length > 0);
        
        // Update storage stats
        updateUsage(
            fileList.length, 
            0, // Notes count (update this if you implement notes)
            (totalSizeBytes / (1024 ** 3)).toFixed(2) // Convert to GB
        );
        
        // Update storage stats text
        document.getElementById('storage-stats-text').textContent = 
            `${fileList.length} ${fileList.length === 1 ? 'file' : 'files'} (${(totalSizeBytes / (1024 ** 3)).toFixed(2)} GB used)`;
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// Make sure to implement these functions:
function downloadFile(fileName) {
    getUserPrefix(userId => {
        const s3 = new AWS.S3();
        const params = {
            Bucket: BUCKET_NAME,
            Key: `${userId}/${fileName}`
        };
        s3.getSignedUrl('getObject', params, (err, url) => {
            if (err) {
                console.error("Download error:", err);
                alert("Error preparing download");
            } else {
                window.open(url);
            }
        });
    });
}

function deleteFile(fileName) {
    getUserPrefix(userId => {
        const s3 = new AWS.S3();
        const params = {
            Bucket: BUCKET_NAME,
            Key: `${userId}/${fileName}`
        };
        s3.deleteObject(params, (err, data) => {
            if (err) {
                console.error("Delete error:", err);
                alert("Error deleting file");
            } else {
                listUserFiles(userId); // Refresh list
            }
        });
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
