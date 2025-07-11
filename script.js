const REGION = "ap-southeast-1";
const USER_POOL_ID = "ap-southeast-1_2GP2VeU1m";
const CLIENT_ID = "14ogj9aammkrug4l8fk4s48pg7";
const IDENTITY_POOL_ID = "ap-southeast-1:71a3f001-c3fb-457e-b454-9354d2267ba5";
const BUCKET_NAME = "cs-notesfiles";

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
		    name: 'John Doe',
		    email: 'john.doe@example.com',
		    avatar: 'JD'
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
		    document.getElementById('dropdown-menu').classList.remove('open');
		    document.getElementById('user-profile').classList.remove('open');
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
		
		// ======= DELETE ACCOUNT =======
		function deleteAccount() {
		    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
		        if (confirm('This will permanently delete all your files and notes. Are you absolutely sure?')) {
		            alert('Account deleted successfully.');
		            showPage('login-page');
		            // TODO: Delete user from Cognito + delete notes/files from S3
		        }
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
		
		// ======= BUTTON ANIMATION =======
		document.querySelectorAll('.upload-btn').forEach(btn => {
		    btn.addEventListener('click', e => {
		        e.target.style.transform = 'scale(0.95)';
		        setTimeout(() => e.target.style.transform = '', 150);
		    });
		});
		
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
		            const name = cognitoUser.getUsername();
		            currentUser.name = name;
		            currentUser.email = name;
		            currentUser.avatar = name[0].toUpperCase();
		
		            updateUserDisplay();
		            showPage('dashboard-page');
		        });
		    } else {
		        showPage('login-page');
		    }
		}
		});
