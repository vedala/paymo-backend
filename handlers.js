import getKnexObj from "./getKnexObj.js";
import { Configuration, PlaidApi } from "plaid";

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

const plaidClient = new PlaidApi(config);

const getWelcome = async (req, res) => {
  res.send("Welcome to Paymo!");
}

const getBanks = async (req, res) => {
  const rows = await knex(process.env.BANKS_TABLE_NAME).select('id', 'name')
    .orderBy('id')
    .catch((err) => { console.error(err); throw err; });

  res.send(rows);
}

const createLinkToken = async (req, res) => {
  return "{}";
}

const exchangePublicToken = async (req, res) => {
  const exchangeResponse = await plaidClient.exchangePublicToken({
    public_token: req.body.public_token,
  });

  req.session.access_token = exchangeResponse.data.access_token;
  res.json(true);
}

export { getWelcome, getBanks, createLinkToken };
