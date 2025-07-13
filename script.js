const REGION = "ap-southeast-1";
const USER_POOL_ID = "ap-southeast-1_2GP2VeU1m";
const CLIENT_ID = "14ogj9aammkrug4l8fk4s48pg7";
const IDENTITY_POOL_ID = "ap-southeast-1:71a3f001-c3fb-457e-b454-9354d2267ba5";
const BUCKET_NAME = "cs-notesfiles";

// ======= INIT ON PAGE LOAD =======
document.addEventListener('DOMContentLoaded', function () {
	if (cognitoUser) {
		cognitoUser.getSession(function (err, session) {
		    if (err || !session.isValid()) {
		        showPage('login-page');
		        return;
		    }
		
// Set credentials
const idToken = session.getIdToken().getJwtToken();
setAWSCredentials(idToken);
		
// Set user info
cognitoUser.getUserAttributes(function (err, attributes) {
			    if (err) {
				console.error("Error getting user attributes:", err);
			        // Set fallback values
			        document.getElementById('user-name').textContent = "User";
			        document.getElementById('user-email').textContent = "user@example.com";
			        document.getElementById('user-avatar').textContent = "U";
			        return;
			    }
			    
			    // Set user data from Cognito attributes
			    const userData = {
			        name: '',
			        email: '',
			    };
			    
			    attributes.forEach(attribute => {
			        if (attribute.getName() === 'name') {
			            userData.name = attribute.getValue();
			        } else if (attribute.getName() === 'email') {
			            userData.email = attribute.getValue();
			        }
			    });
			
			    // Set display values
			    document.getElementById('user-name').textContent = userData.name || "User";
			    document.getElementById('user-email').textContent = userData.email || "user@example.com";
			    
			    // Generate avatar initials
			    const avatarText = userData.name 
			        ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase()
			        : (userData.email ? userData.email[0].toUpperCase() : "U");
			    
			    document.getElementById('user-avatar').textContent = avatarText;
			});
		    } else {
		        showPage('login-page');
		    }
		});

        const poolData = {
		    UserPoolId: USER_POOL_ID,
		    ClientId: CLIENT_ID
		};
		
		const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
		let cognitoUser = userPool.getCurrentUser();
		
		// Configure AWS credentials using Cognito Identity
		function setAWSCredentials(idTokenJwt) {
		    AWS.config.region = REGION;
		    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
		        IdentityPoolId: IDENTITY_POOL_ID,
		        Logins: {
		            [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idTokenJwt
		        }
		    });
		
		    AWS.config.credentials.get(function (err) {
		        if (err) {
		            console.error("Error getting AWS credentials", err);
		        } else {
		            console.log("AWS credentials set");
		        }
		    });
		}

		// ======= GLOBAL USER DATA =======
		let currentUser = {
		    name: '',
		    email: '',
		    avatar: ''
		};
		
		// ======= PAGE NAVIGATION =======
		function showPage(pageId) {
		    document.querySelectorAll('.page').forEach(page => {
		        page.classList.remove('active');
		    });
		    document.getElementById(pageId).classList.add('active');
		}
		
		// ======= USER DROPDOWN MENU =======
		document.getElementById('user-profile').addEventListener('click', function (e) {
		    e.stopPropagation();
		    const dropdown = document.getElementById('dropdown-menu');

		    this.classList.toggle('open');
		    dropdown.classList.toggle('open');
		});
		
		// Close dropdown if click outside
		document.addEventListener('click', function () {

			if (dropdown.classList.contains('open')) {
                		dropdown.classList.remove('open');
                		profile.classList.remove('open');
            		}

		    //document.getElementById('dropdown-menu').classList.remove('open');
		    //document.getElementById('user-profile').classList.remove('open');
		});
		
		// ======= TABS =======
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
		
		// ======= PROFILE FORM SUBMIT =======
		document.getElementById('profile-form').addEventListener('submit', function (e) {
		    e.preventDefault();
		    const name = document.getElementById('profile-full-name').value;
		    const email = document.getElementById('profile-email-input').value;
		
		    currentUser.name = name;
		    currentUser.email = email;
		    currentUser.avatar = name.split(' ').map(n => n[0]).join('').toUpperCase();
		
		    updateUserDisplay();
		    alert('Profile updated successfully!');
		});
		
		// ======= UPDATE USER DISPLAY =======
		function updateUserDisplay() {
		    document.getElementById('user-name').textContent = currentUser.name;
		    document.getElementById('user-email').textContent = currentUser.email;
		    document.getElementById('user-avatar').textContent = currentUser.avatar;
		
		    document.getElementById('profile-name').textContent = currentUser.name;
		    document.getElementById('profile-email').textContent = currentUser.email;
		    document.getElementById('profile-avatar').textContent = currentUser.avatar;
		    document.getElementById('profile-full-name').value = currentUser.name;
		    document.getElementById('profile-email-input').value = currentUser.email;
		}
		
		// ======= SIGN OUT =======
		function signOut() {
		    if (confirm('Are you sure you want to sign out?')) {
		        showPage('login-page');
		        document.getElementById('login-form').reset();
		        // TODO: Sign out from AWS Cognito here
		    }
		}
		
		
		// ======= USAGE STATS BAR =======
		function updateUsage(files, notes, storage) {
		    document.getElementById('files-progress').value = (files / 1000) * 100;
		    document.getElementById('notes-progress').value = (notes / 500) * 100;
		    document.getElementById('storage-progress').value = (storage / 50) * 100;
		
		    document.getElementById('files-count').textContent = `${files} / 1,000`;
		    document.getElementById('notes-count').textContent = `${notes} / 500`;
		    document.getElementById('storage-count').textContent = `${storage} GB / 50 GB`;
		}
		
        document.querySelectorAll('.upload-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 150);
            });
        });

		// ======= BUTTON ANIMATION =======
		document.querySelectorAll('.upload-btn').forEach(btn => {
		    btn.addEventListener('click', e => {
		        e.target.style.transform = 'scale(0.95)';
		        setTimeout(() => e.target.style.transform = '', 150);
		    });
		});


        // ======= S3 KEY HELPER =======
        function getUserPrefix(callback) {
            AWS.config.credentials.get(function (err) {
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

        // ======= UPLOAD FILE EXAMPLE (with folder path) =======
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

        // ======= DOWNLOAD FILE EXAMPLE (with folder path) =======
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

        // ======= DELETE FILE EXAMPLE (with folder path) =======
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
