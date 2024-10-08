import axios from "axios";
import getKnexObj from "./getKnexObj.js";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { Moov, CAPABILITIES, SCOPES } from "@moovio/node";
import { v4 as uuidv4 } from "uuid";
import { auth } from "express-oauth2-jwt-bearer";
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(
  ',',
);

const knex = getKnexObj();

const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
      "Plaid-Version": "2020-09-14",
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);


//
//
//
const getWelcome = async (req, res) => {
  res.send("Welcome to Paymo!");
}


//
//
//
const getBanks = async (req, res) => {
  const rows = await knex(process.env.BANKS_TABLE_NAME).select('id', 'name')
    .where({user_id: req.query.user_id})
    .orderBy('id')
    .catch((err) => { console.error(err); throw err; });

  res.send(rows);
}


//
//
//
const getRecipients = async (req, res) => {
  const rows = await knex(process.env.RECIPIENTS_TABLE_NAME).select('id', 'name')
    .where({sender_user_id: req.query.sender_user_id})
    .orderBy('id')
    .catch((err) => { console.error(err); throw err; });

  res.send(rows);
}


//
//
//
const getUserByEmail = async (req, res) => {
  const managementAccessTokenRows = await knex('management_access_token').select('access_token')
    .catch((err) => { console.error(err); throw err; });

  const managementApiAccessToken = managementAccessTokenRows[0].access_token;
  const searchEmail = req.query["searchEmail"];
  const senderUserId = req.query["senderUserId"];
  const queryParams = {
    q: `email:${searchEmail}`
  };

  const options = {
    method: 'GET',
    url: `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
    headers: {
      'authorization': `Bearer ${managementApiAccessToken}`
    },
    params: queryParams
  };

  const axiosResponse = await axios(options);
console.log("getUserByEmail: axiosResponse.data=", axiosResponse.data);
  const userData = [];
  if (axiosResponse.data.length > 0) {
    userData.push({
      sender_user_id: senderUserId,
      recipient_user_id: axiosResponse.data[0].user_id,
      name: axiosResponse.data[0].name,
      email: axiosResponse.data[0].email,
    });
  }
console.log("userData=", userData);

  if (userData.length > 0) {
    await knex('recipients').insert(userData[0]).returning('id')
    .catch((err) => { console.error(err); throw err })
  }

  res.send(userData);
}


//
//
//
const createLinkToken = async (req, res) => {
  const tokenResponse = await plaidClient.linkTokenCreate({
    // user: { client_user_id: req.sessionID },
    user: { client_user_id: "some_user" },
    client_name: "Paymo",
    language: "en",
    products: ["auth"],
    country_codes: ["US"],
    // redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI,
  });
console.log("tokenResponse=", tokenResponse);
  res.json(tokenResponse.data);
}


//
//
//
const exchangePublicToken = async (req, res) => {
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: req.body.public_token,
  });

  const userId = req.body.user_id;
  const userName = req.body.user_name;
  const userEmail = req.body.user_email;

console.log("exchangePublicToken: exchangeResponse.data", exchangeResponse.data);
console.log("exchangePublicToken: exchangeResponse.data.access_token=", exchangeResponse.data.access_token);

  const accessToken = exchangeResponse.data.access_token;


const plaidResponse = await plaidClient.accountsGet({ access_token: accessToken });
console.log("plaidResponse.data.accounts=", plaidResponse.data.accounts);
  const accountId = plaidResponse.data.accounts[0].account_id;

  const processorRequest = {
    access_token: accessToken,
    account_id: accountId,
    processor: 'moov',
  }

  const processorTokenResponse = await plaidClient.processorTokenCreate(
    processorRequest,
  );

console.log("processorTokenResponse.data=", processorTokenResponse.data);
  const itemResponse = await plaidClient.itemGet({
    access_token: accessToken,
  });

// ===========================================
  //
  // moov client creation
  //
  const moovCredentials = {
    accountID: process.env.MOOV_ACCOUNT_ID,
    publicKey: process.env.MOOV_PUBLIC_KEY,
    secretKey: process.env.MOOV_SECRET_KEY,
    domain: process.env.MOOV_DOMAIN,
  };

  const moovClient = new Moov(moovCredentials);

  //
  // moov get access token
  //

  const moovAccessToken = await moovClient.generateToken(
    [
      SCOPES.ACCOUNTS_CREATE,
      SCOPES.ACCOUNTS_READ,
    ],
    process.env.MOOV_ACCOUNT_ID);
console.log("moovAccessToken=", moovAccessToken);

  // const moovTOSToken = await axios.get("https://api.moov.io/tos-token", {
  //   headers: {
  //     authorization: `Bearer ${moovAccessToken}`
  //   }
  // });

// console.log("moovTOSToken=", moovTOSToken);
// console.log("moovClient.accounts.termsOfService=", moovClient.accounts.termsOfService);
// moovClient.accounts.acceptTermsOfService();

  //
  // moov account creation
  //
  const moovAccountCreateProfile = {
    "individual": {
    // name: { firstName: `${userName}first`, lastName: `${userName}last`},
    name: { firstName: `userNamefirst`, lastName: `userNamelast`},
    phone: {number: "123-456-7890", countryCode: "1"},
    email: `${userEmail}`,
    address: {addressLine1: "123 Main St", city: "Los Angeles", stateOrProvince: "CA", postalCode:"90001", country: "US"},
    // birthDateProvided: false,
    // governmentIdProvided: false,
    birthDate: { "day": 9, "month": 11, "year": 1989 },
    governmentId: { "ssn": {full: "123-45-0000", lastFour: "0000"}},
    }
  };

  const accountCreateObject = {
    accountType: "individual",
    profile: moovAccountCreateProfile,
    metadata: { metaKey1: "metaValue1" },
    termsOfService: null,
    customerSupport: null,
    settings: null,
  };

  const moovAccountCreateResponse = await moovClient.accounts.create(accountCreateObject);
  const moovAccountId  = moovAccountCreateResponse.accountID;
console.log("moovAccountCreateResponse=", moovAccountCreateResponse);

  //
  // moov add capabilities
  //
  const moovRequestCapabilitiesResponse = await moovClient.capabilities.requestCapabilities(
    moovAccountId,
    [CAPABILITIES.SEND_FUNDS, CAPABILITIES.WALLET],
  );

console.log("moovRequestCapabilitiesResponse=", moovRequestCapabilitiesResponse);
// ===========================================

  const institutionId = itemResponse.data.item.institution_id;
  const instResponse = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: PLAID_COUNTRY_CODES,
  })

// console.log("instResponse.data=", instResponse.data);
  const institutionName = instResponse.data.institution.name;

  const itemInfo = {
    user_id: userId,
    name: institutionName,
    item_id: exchangeResponse.data.item_id,
    access_token: exchangeResponse.data.access_token,
    moov_processor_token: processorTokenResponse.data.processor_token,
    moov_processor_request_id: processorTokenResponse.data.request_id,
    moov_account_id: moovAccountId,
  };

  await knex(process.env.BANKS_TABLE_NAME).insert(itemInfo).returning('id')
    .catch((err) => { console.error(err); throw err; });


  res.json({ moovAccessToken });
}


//
//
//
const sendMoney = async (req, res) => {
console.log("sendMoney: req.body=", req.body);
  // We are sending money from our account to selected recipient's account
  // Need to figure out:
  //    - How to deduct money from our account
  //    - How to send money to a recipient
  //      (The charges API seems to be designed for getting money from recipient's account
  //       to ours).
}

export {
  getWelcome,
  getBanks,
  getRecipients,
  getUserByEmail,
  createLinkToken,
  exchangePublicToken,
  sendMoney,
};
