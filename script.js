// Global user data
const REGION = "ap-southeast-1"; // AWS region
const BUCKET_NAME = "cs-notesfiles"; // bucket name 
const IDENTITY_POOL_ID = "ap-southeast-1:71a3f001-c3fb-457e-b454-9354d2267ba5"; // from Cognito

const poolData = {
  UserPoolId: 'ap-southeast-1_2GP2VeU1m', 
  ClientId: '14ogj9aammkrug4l8fk4s48pg7'
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
const cognitoUser = userPool.getCurrentUser();

let currentUser = {
  name: 'Loading...',
  email: 'Loading...',
  avatar: '?'
};

        // Page navigation
        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(pageId).classList.add('active');
        }

        // User profile dropdown
        document.getElementById('user-profile').addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('dropdown-menu');
            const profile = document.getElementById('user-profile');
            
            profile.classList.toggle('open');
            dropdown.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            const dropdown = document.getElementById('dropdown-menu');
            const profile = document.getElementById('user-profile');
            
            if (dropdown.classList.contains('open')) {
                dropdown.classList.remove('open');
                profile.classList.remove('open');
            }
        });

        // Tab switching functionality
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                tab.classList.add('active');
                const targetTab = tab.getAttribute('data-tab');
                document.getElementById(targetTab).classList.add('active');
            });
        });

        

        // Profile form handling
        document.getElementById('profile-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('profile-full-name').value;
            const email = document.getElementById('profile-email-input').value;
            
            // Update user data
            currentUser.name = name;
            currentUser.email = email;
            currentUser.avatar = name.split(' ').map(n => n[0]).join('').toUpperCase();
            
            updateUserDisplay();
            alert('Profile updated successfully!');
        });

        // Update user display across all pages
        function updateUserDisplay() {
                // Dashboard user info
                document.getElementById('user-name').textContent = currentUser.name;
                document.getElementById('user-email').textContent = currentUser.email;
                document.getElementById('user-avatar').textContent = currentUser.avatar;
            
                // Profile page
                document.getElementById('profile-name').textContent = currentUser.name;
                document.getElementById('profile-email').textContent = currentUser.email;
                document.getElementById('profile-avatar').textContent = currentUser.avatar;
                document.getElementById('profile-full-name').value = currentUser.name;
                document.getElementById('profile-email-input').value = currentUser.email;
        }

        function fetchUserFromCognito() {
          if (cognitoUser != null) {
            cognitoUser.getSession(function (err, session) {
              if (err) {
                console.error("Session error:", err);
                return;
              }
        
              cognitoUser.getUserAttributes(function (err, attributes) {
                if (err) {
                  console.error("Error getting user attributes", err);
                  return;
                }
        
                const attrMap = {};
                attributes.forEach(attr => {
                  attrMap[attr.getName()] = attr.getValue();
                });
        
                currentUser.name = attrMap.name || 'No Name';
                currentUser.email = attrMap.email || 'No Email';
                currentUser.avatar = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        
                updateUserDisplay();
              });
            });
          } else {
            console.warn("No user session found.");
          }
        }
        // Settings toggle switches
        function toggleSwitch(element) {
            element.classList.toggle('active');
        }

        // Sign out function
        function signOut() {
            if (confirm('Are you sure you want to sign out?')) {
                
        }

        // Delete account function
        function deleteAccount() {
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                if (confirm('This will permanently delete all your files and notes. Are you absolutely sure?')) {
                    alert('Account deleted successfully.');
                    
            }
        }

        // Usage statistics simulation
        function updateUsage(files, notes, storage) {
            const fileFill = document.getElementById('files-progress');
            const notesFill = document.getElementById('notes-progress');
            const storageFill = document.getElementById('storage-progress');

            fileFill.value = (files / 1000) * 100;
            notesFill.value = (notes / 500) * 100;
            storageFill.value = (storage / 50) * 100;

            document.getElementById('files-count').textContent = `${files} / 1,000`;
            document.getElementById('notes-count').textContent = `${notes} / 500`;
            document.getElementById('storage-count').textContent = `${storage} GB / 50 GB`;
        }

        // Button interactions
        document.querySelectorAll('.upload-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 150);
            });
        });

        // Initialize the app
        document.addEventListener('DOMContentLoaded', function() {
            updateUserDisplay();
        });

        // Setup S3 upload listener after DOM is ready
    const fileInput = document.getElementById("fileInput");

    if (fileInput) {
        fileInput.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const credentials = awsCognitoIdentity.fromCognitoIdentityPool({
                clientConfig: { region: REGION },
                identityPoolId: IDENTITY_POOL_ID,
            });

            const s3Client = new awsS3.S3Client({
                region: REGION,
                credentials,
            });

            const upload = new awsLibStorage.Upload({
                client: s3Client,
                params: {
                    Bucket: BUCKET_NAME,
                    Key: `uploads/${file.name}`,
                    Body: file,
                    ContentType: file.type,
                },
            });

            try {
                await upload.done();
                alert("File uploaded successfully!");
            } catch (error) {
                console.error("Upload failed: ", error);
                alert("Failed to upload.");
            }
        });
    }
});
