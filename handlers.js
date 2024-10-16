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
const createDwollaCustomer = async (firstName, lastName, userEmail) => {
  try {
    const response = await axios.post(
      `${process.env.DWOLLA_BASE_URL}/customers`,
      {
        firstName,
        lastName,
        email: `${Math.random() // because Dwolla does not allow identical emails, and sandbox data is always the same.
          .toString(36)
          .slice(2)}${userEmail}`,
        ipAddress: '99.99.99.99',
        type: 'personal',
        address1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        dateOfBirth: '1990-07-25',
        ssn: "1234"
      },
      {
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${process.env.DWOLLA_ACCESS_TOKEN}`,
          Accept: 'application/vnd.dwolla.v1.hal+json',
        }
      },
    );
    return response.headers.location;
  } catch (err) {
    console.log('err: ', err);
    throw new Error("Error on api call to Dwolla /customers");
  }
};


//
// send processor token to Dwolla customer url to create customer Funding source
// and obtain customer funding source url
//
const createDwollaCustomerFundingSource = async (
  account,
  customerUrl,
  processorToken
) => {
  try {
    const response = await axios.post(
      `${customerUrl}/funding-sources`,
      {
        plaidToken: processorToken,
        name: account.subtype,
      },
      {
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${process.env.DWOLLA_ACCESS_TOKEN}`,
          Accept: 'application/vnd.dwolla.v1.hal+json',
        },
      }
    );
    return response.headers.location;
  } catch (err) {
    console.log('err:', err);
    throw new Error("Error on api call to Dwolla /funding-sources");
  }
};

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
console.log("createLink tokenResponse.data=", tokenResponse.data);
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

  //
  // userName is received from frontend, which is Auth0 userName (it is set to email).
  // create first name and last name by cutting the value before "@"
  const emailNamePortion = userName.split("@")[0];
  const userFirstName = `${emailNamePortion}First`;
  const userLastName = `${emailNamePortion}Last`;

  console.log("exchangePublicToken: req.userName=", userName);
  console.log("exchangePublicToken: req.userEmail=", userEmail);
  console.log("exchangePublicToken: exchangeResponse.data", exchangeResponse.data);
  console.log("exchangePublicToken: exchangeResponse.data.access_token=", exchangeResponse.data.access_token);

  const accessToken = exchangeResponse.data.access_token;


  const plaidResponse = await plaidClient.accountsGet({ access_token: accessToken });
  console.log("plaidResponse.data.accounts=", plaidResponse.data.accounts);

  const accountId = plaidResponse.data.accounts[0].account_id;

  const processorRequest = {
    access_token: accessToken,
    account_id: accountId,
    processor: 'dwolla',
  }

  const processorTokenResponse = await plaidClient.processorTokenCreate(
    processorRequest,
  );
  const processorToken = processorTokenResponse.data.processor_token;
  console.log("processorTokenResponse.data=", processorTokenResponse.data);

  const dwollaCustomerUrl = await createDwollaCustomer(userFirstName, userLastName, userEmail);
  console.log("dwollaCustomerUrl=", dwollaCustomerUrl);

  const dwollaFundingSourceUrl = await createDwollaCustomerFundingSource(
    plaidResponse.data.accounts[0],
    dwollaCustomerUrl,
    processorToken
  );

  console.log("dwollaFundingSourceUrl=", dwollaFundingSourceUrl);

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
    user_id: userId,
    name: institutionName,
    item_id: exchangeResponse.data.item_id,
    access_token: exchangeResponse.data.access_token,
    dwolla_processor_token: processorTokenResponse.data.processor_token,
    dwolla_processor_request_id: processorTokenResponse.data.request_id,
    dwolla_customer_url: dwollaCustomerUrl,
    dwolla_funding_source_url: dwollaFundingSourceUrl,
  };

  await knex(process.env.BANKS_TABLE_NAME).insert(itemInfo).returning('id')
    .catch((err) => { console.error(err); throw err; });


  res.json(true);
}

const getFundingSourceByRecipientId = async (recipientId) => {
  // get recipient_user_id from recipients table
  const recipientRows = await knex(process.env.RECIPIENTS_TABLE_NAME).select('recipient_user_id')
    .where({id: recipientId})
    .catch((err) => { console.error(err); throw err; });

  const recipientUserId = recipientRows[0].recipient_user_id;

  // get from banks table using user_id
  const bankRows = await knex(process.env.BANKS_TABLE_NAME).select('dwolla_funding_source_url')
    .where({user_id: recipientUserId})
    .catch((err) => { console.error(err); throw err; });

  const dwollaFundingSourceUrl = bankRows[0].dwolla_funding_source_url;
  return dwollaFundingSourceUrl;
}

const getFundingSrouceByBankId = async (bankId) => {
  const bankRows = await knex(process.env.BANKS_TABLE_NAME).select('dwolla_funding_source_url')
    .where({id: bankId})
    .catch((err) => { console.error(err); throw err; });

  const dwollaFundingSourceUrl = bankRows[0].dwolla_funding_source_url;
  return dwollaFundingSourceUrl;
}

const dwollaTransfer = async (
  sourceUrl,
  destinationUrl,
  amount,
) => {
  const requestBody = {
    _links: {
      source: {
        href: sourceUrl,
      },
      destination: {
        href: destinationUrl,
      },
    },
    amount: {
      currency: "USD",
      value: amount,
    },
  };

  try {
    const transferResponse = await axios.post(
      `${process.env.DWOLLA_BASE_URL}/transfers`,
      requestBody,
      {
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${process.env.DWOLLA_ACCESS_TOKEN}`,
          Accept: 'application/vnd.dwolla.v1.hal+json',
        }
      }
    );
    return transferResponse.headers.location
  } catch (err) {
    console.log('err: ', err);
    throw new Error("Error on api call to Dwolla /transfers");
  };
}

//
//
//
const sendMoney = async (req, res) => {
  console.log("sendMoney: req.body=", req.body);

  // get sender funding source
  const senderFundingSourceUrl = await getFundingSrouceByBankId(req.body.bank_id);

  console.log("sender funding source url=", senderFundingSourceUrl);

  // get recipeint funding source
  const recipientFundingSourceUrl = await getFundingSourceByRecipientId(req.body.recipient_id);

  console.log("recipient funding source url=", recipientFundingSourceUrl);

  // make a transfer
  const transferUrl = await dwollaTransfer(
    senderFundingSourceUrl,
    recipientFundingSourceUrl,
    req.body.amount,
  );

  console.log("transferUrl=", transferUrl);

  // save transfer url to database
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
