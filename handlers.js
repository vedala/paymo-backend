import getKnexObj from "./getKnexObj.js";

const knex = getKnexObj();

const getWelcome = async (req, res) => {
  res.send("Welcome to Paymo!");
}

const getBanks = async (req, res) => {
  const rows = await knex(process.env.BANKS_TABLE_NAME).select('id', 'name')
    .orderBy('id')
    .catch((err) => { console.error(err); throw err; });

  res.send(rows);
}

export { getWelcome, getBanks };
