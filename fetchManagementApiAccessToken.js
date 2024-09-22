import axios from "axios";

async function fetchManagementApiAccessToken() {
  const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
  const AUTH0_MANAGEMENT_API_TEST_APP_CLIENT_ID = process.env.AUTH0_MANAGEMENT_API_TEST_APP_CLIENT_ID;
  const AUTH0_MANAGEMENT_API_TEST_APP_CLIENT_SECRET = process.env.AUTH0_MANAGEMENT_API_TEST_APP_CLIENT_SECRET;

  const options = {
    method: 'POST',
    url: `https://${AUTH0_DOMAIN}/oauth/token`,
    headers: {'content-type': 'application/json'},
    data: {
      client_id: AUTH0_MANAGEMENT_API_TEST_APP_CLIENT_ID,
      client_secret: AUTH0_MANAGEMENT_API_TEST_APP_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials'
    }
  };

  const response = await axios(options);
  return response.data.access_token;
}

export default fetchManagementApiAccessToken;
