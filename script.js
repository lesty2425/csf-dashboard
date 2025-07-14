// ===== AWS Cognito & S3 Config =====
const REGION = "ap-southeast-1";
const USER_POOL_ID = "ap-southeast-1_2GP2VeU1m";
const CLIENT_ID = "14ogj9aammkrug4l8fk4s48pg7";
const IDENTITY_POOL_ID = "ap-southeast-1:71a3f001-c3fb-457e-b454-9354d2267ba5";
const BUCKET_NAME = "cs-notesfiles";

let currentUser = { name: '', email: '', avatar: '' };

// ===== Init Cognito Hosted UI Auth =====
const authData = {
  ClientId: CLIENT_ID,
  AppWebDomain: "ap-southeast-1_2GP2VeU1m.auth.ap-southeast-1.amazoncognito.com",
  TokenScopesArray: ["email", "openid", "profile"],
  RedirectUriSignIn: "https://lesty2425.github.io/csf-dashboard/",
  RedirectUriSignOut: "https://lesty2425.github.io/csf-dashboard/"
};

const auth = new AmazonCognitoIdentity.CognitoAuth(authData);
auth.userhandler = {
  onSuccess: function (result) {
    const idToken = auth.getSignInUserSession().getIdToken().getJwtToken();
    setAWSCredentials(idToken);

    const payload = parseJwt(idToken);
    currentUser.name = payload.name || "";
    currentUser.email = payload.email || "";
    currentUser.avatar = currentUser.name.charAt(0).toUpperCase();

    updateUserDisplay();
    showPage("dashboard-page");
  },
  onFailure: function (err) {
    console.error("Auth failure:", err);
    showPage("login-page");
  }
};

if (window.location.href.includes("code=")) {
  auth.parseCognitoWebResponse(window.location.href);
}

// ===== Utils =====
function setAWSCredentials(idTokenJwt) {
  AWS.config.region = REGION;
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IDENTITY_POOL_ID,
    Logins: {
      [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idTokenJwt
    }
  });

  AWS.config.credentials.get(function (err) {
    if (err) console.error("AWS creds error", err);
    else console.log("AWS credentials set");
  });
}

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse token", e);
    return {};
  }
}

function getUserPrefix(callback) {
  AWS.config.credentials.get(function (err) {
    if (err) {
      console.error("Unable to get AWS credentials", err);
      callback(null);
    } else {
      const identityId = AWS.config.credentials.identityId;
      const userId = identityId.split(':')[1];
      callback(userId);
    }
  });
}

function updateUserDisplay() {
  document.getElementById('user-name').textContent = currentUser.name || "User";
  document.getElementById('user-email').textContent = currentUser.email || "user@example.com";
  document.getElementById('user-avatar').textContent = currentUser.avatar || "U";
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');
}

function signOut() {
  auth.signOut();
}

// ===== DOM Ready Init =====
document.addEventListener('DOMContentLoaded', function () {
  // Dropdown logic
  const profileElement = document.getElementById('user-profile');
  const dropdownElement = document.getElementById('dropdown-menu');

  if (profileElement && dropdownElement) {
    profileElement.addEventListener('click', function (e) {
      e.stopPropagation();
      this.classList.toggle('open');
      dropdownElement.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('#user-profile')) {
        dropdownElement.classList.remove('open');
        profileElement.classList.remove('open');
      }
    });
  }

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      this.classList.add('active');
      const targetId = this.getAttribute('data-tab');
      document.getElementById(targetId)?.classList.add('active');
    });
  });

  // User Pool session check
  const poolData = { UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID };
  const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
  const cognitoUser = userPool.getCurrentUser();

  if (!cognitoUser) {
    showPage('login-page');
    return;
  }

  cognitoUser.getSession(function (err, session) {
    if (err || !session.isValid()) {
      showPage('login-page');
      return;
    }

    const idToken = session.getIdToken().getJwtToken();
    setAWSCredentials(idToken);

    cognitoUser.getUserAttributes(function (err, attributes) {
      if (!err) {
        currentUser.name = attributes.find(a => a.getName() === 'name')?.getValue() || '';
        currentUser.email = attributes.find(a => a.getName() === 'email')?.getValue() || '';
        currentUser.avatar = currentUser.name?.charAt(0).toUpperCase() || 'U';
      }
      updateUserDisplay();
      showPage("dashboard-page");
    });
  });
});
