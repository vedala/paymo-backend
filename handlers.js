import axios from "axios";
import getKnexObj from "./getKnexObj.js";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { v4 as uuidv4 } from "uuid";
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

const generateSilaJwtToken = async () => {
  const currentTime = (new Date()).getTime();
  const basicAuthString = 'Basic ' + Buffer.from(`${process.env.SILA_MONEY_CLIENT_ID}` + ':' + `${process.env.SILA_MONEY_CLIENT_SECRET}`).toString('base64');

  const options = {
    method: 'POST',
    url: `https://${process.env.SILA_MONEY_API_URL}/0.2/auth_token`,
    headers: {
      authorization: basicAuthString,
    },
    data: {
      header: {
        created: currentTime,
        app_handle: `${process.env.SILA_MONEY_APP_HANDLE}`,
        version: "0.2",
        reference: uuidv4(),
      },
    }
  };

  let silaAccessToken;
  await axios(options)
    .then(res => {
      silaAccessToken = res.data.access_token.token;
    })
    .catch(err => {console.log(err); throw err; });

  return silaAccessToken;
}

//
//
//
const exchangePublicToken = async (req, res) => {
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: req.body.public_token,
  });

console.log("exchangePublicToken: exchangeResponse.data", exchangeResponse.data);
console.log("exchangePublicToken: exchangeResponse.data.access_token=", exchangeResponse.data.access_token);

  const accessToken = exchangeResponse.data.access_token;


const plaidResponse = await plaidClient.accountsGet({ access_token: accessToken });
console.log("plaidResponse.data.accounts=", plaidResponse.data.accounts);
  const accountId = plaidResponse.data.accounts[0].account_id;

  const processorRequest = {
    access_token: accessToken,
    account_id: accountId,
    processor: 'sila_money',
  };

  const processorTokenResponse = await plaidClient.processorTokenCreate(
      processorRequest,
  );

  console.log("processorTokenResponse=", processorTokenResponse);

  const silaMoneyToken = processorTokenResponse.data.processor_token;

  const itemResponse = await plaidClient.itemGet({
    access_token: accessToken,
  });

  const institutionId = itemResponse.data.item.institution_id;
  const instResponse = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: PLAID_COUNTRY_CODES,
  })

// console.log("instResponse.data=", instResponse.data);
  const institutionName = instResponse.data.institution.name;

  const itemInfo = {
    user_id: req.body.user_id,
    name: institutionName,
    item_id: exchangeResponse.data.item_id,
    access_token: exchangeResponse.data.access_token,
    silamoney_token: silaMoneyToken,
    silamoney_request_id: processorTokenResponse.data.request_id,
  };

  await knex(process.env.BANKS_TABLE_NAME).insert(itemInfo).returning('id')
    .catch((err) => { console.error(err); throw err; });

  //
  // get sila jwt token
  //

  const silaJwtToken = await generateSilaJwtToken();
console.log("silajwt=", silaJwtToken);

  //
  // Call Sila money link_account
  //

  const options = {
    method: 'POST',
    url: `https://${process.env.SILA_MONEY_API_URL}/0.2/link_account`,
    headers: {
      authorization: `Bearer ${silaJwtToken}`,
    },
    data: {
      header: {
        created: (new Date()).getTime(),
        app_handle: `${process.env.SILA_MONEY_APP_HANDLE}`,
        user_handle: `${process.env.SILA_MONEY_APP_HANDLE}-user`,
        version: "0.2",
        reference: uuidv4(),
      },
      provider_token: silaMoneyToken,
      provider: "plaid",
      account_type: "CHECKING",
      provider_token_type: "processor",
      selected_account_id: accountId,
      account_name: institutionName,
    }
  };

  let linkAccountResponseData;
  await axios(options)
    .then(res => {
      linkAccountResponseData = res.data;
    })
    // .catch(err => { console.log(err); throw err; });

console.log("Sila Link Account response data=", linkAccountResponseData);
  res.json(true);
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
