// ===== AWS SDK Initialization =====
AWS.config.region = REGION;

// ===== AWS Cognito & S3 Config =====
const REGION = "ap-southeast-1";
const USER_POOL_ID = "ap-southeast-1_2GP2VeU1m";
const CLIENT_ID = "14ogj9aammkrug4l8fk4s48pg7";
const IDENTITY_POOL_ID = "ap-southeast-1:71a3f001-c3fb-457e-b454-9354d2267ba5";
const BUCKET_NAME = "cs-notesfiles";
const COGNITO_DOMAIN = "csf-dashboard.auth.ap-southeast-1.amazoncognito.com"; // Changed this

let currentUser = { name: '', email: '', avatar: '' };

// ===== Init Cognito Hosted UI Auth =====
const authData = {
  ClientId: CLIENT_ID,
  AppWebDomain: COGNITO_DOMAIN, // Fixed: Removed user pool ID from domain
  TokenScopesArray: ["email", "openid", "profile"],
  RedirectUriSignIn: "https://lesty2425.github.io/csf-dashboard/",
  RedirectUriSignOut: "https://lesty2425.github.io/csf-dashboard/",
  IdentityProvider: "COGNITO" // Explicitly set identity provider
};

const auth = new AmazonCognitoIdentity.CognitoAuth(authData);
auth.userhandler = {
  onSuccess: function (result) {
    console.log("Auth success");
    const session = auth.getSignInUserSession();
    if (!session) {
      console.error("No session found");
      showPage("login-page");
      return;
    }

    const idToken = session.getIdToken().getJwtToken();
    if (!idToken) {
      console.error("No ID token found");
      showPage("login-page");
      return;
    }

    setAWSCredentials(idToken);

    try {
      const payload = parseJwt(idToken);
      currentUser = {
        name: payload.name || "",
        email: payload.email || "",
        avatar: (payload.name || "U").charAt(0).toUpperCase()
      };
      updateUserDisplay();
      showPage("dashboard-page");
    } catch (e) {
      console.error("Error processing user data:", e);
      showPage("login-page");
    }
  },
  onFailure: function (err) {
    console.error("Auth failure:", err);
    showPage("login-page");
  }
};

// Parse Cognito response if we have a code in the URL
if (window.location.href.includes("code=")) {
  try {
    auth.parseCognitoWebResponse(window.location.href);
  } catch (e) {
    console.error("Error parsing Cognito response:", e);
    showPage("login-page");
  }
}

// ===== Improved setAWSCredentials function =====
function setAWSCredentials(idTokenJwt) {
  return new Promise((resolve, reject) => {
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idTokenJwt
      }
    });

    AWS.config.credentials.refresh(error => {
      if (error) {
        console.error("AWS creds error", error);
        reject(error);
      } else {
        console.log("AWS credentials set successfully");
        resolve();
      }
    });
  });
}

// Rest of your functions remain the same (parseJwt, getUserPrefix, updateUserDisplay, showPage, signOut)

// ===== Improved DOM Ready Init =====
document.addEventListener('DOMContentLoaded', function () {
  // Your existing DOM event handlers...

  // Improved User Pool session check
  const poolData = { UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID };
  const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
  const cognitoUser = userPool.getCurrentUser();

  if (!cognitoUser) {
    showPage('login-page');
    return;
  }

  cognitoUser.getSession(function (err, session) {
    if (err || !session?.isValid?.()) {
      console.error("Invalid session:", err);
      showPage('login-page');
      return;
    }

    const idToken = session.getIdToken().getJwtToken();
    if (!idToken) {
      console.error("No ID token in session");
      showPage('login-page');
      return;
    }

    setAWSCredentials(idToken)
      .then(() => {
        cognitoUser.getUserAttributes(function (err, attributes) {
          if (err) {
            console.error("Error getting user attributes:", err);
            showPage('login-page');
            return;
          }
          
          currentUser = {
            name: attributes.find(a => a.getName() === 'name')?.getValue() || '',
            email: attributes.find(a => a.getName() === 'email')?.getValue() || '',
            avatar: (attributes.find(a => a.getName() === 'name')?.getValue() || 'U').charAt(0).toUpperCase()
          };
          
          updateUserDisplay();
          showPage("dashboard-page");
        });
      })
      .catch(err => {
        console.error("Error setting AWS credentials:", err);
        showPage('login-page');
      });
  });
});
